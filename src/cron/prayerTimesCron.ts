import dayjs from "dayjs";
import Redis from "ioredis";
import cron from "node-cron";
import User from "../database/models/User";
import Day from "../database/models/Day";
import { getPrayTime } from "../shared/requests";
import { Queue, QueueEvents, Worker } from "bullmq";
import { sendAzkarNotification } from "../handlers/azkarNotification";

const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

export type PrayerType = "Fajr" | "Maghrib";

export const azkarQueue = new Queue("azkar", { connection });
export const azkarQueueEvents = new QueueEvents("azkar", { connection });

function jobKey(userId: string, prayer: PrayerType, date: string) {
  return `azkar:${userId}:${prayer}:${date}`;
}

export async function scheduleAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string,
  runAtISO: string
): Promise<void> {
  const type = prayer === "Fajr" ? "morning" : "evening";

  const existing = await Day.findOne({ userId, date, type });
  if (
    existing &&
    (existing.status === "skipped" || existing.status === "read")
  ) {
    return;
  }

  const runAt = new Date(runAtISO).getTime();
  const now = Date.now();
  if (runAt <= now) return;

  const delay = runAt - now;
  const jobId = jobKey(userId, prayer, date);

  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) await oldJob.remove();

  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );
}

export async function updatePrayerTimesAndSchedule(
  telegramId?: number
): Promise<void> {
  let users;
  if (telegramId) {
    users = await User.find({ telegramId });
  } else {
    users = await User.find({
      "location.latitude": { $exists: true },
      "location.longitude": { $exists: true },
      blocked: false,
    });
  }

  for (const user of users) {
    if (!user.location) continue;
    const { latitude, longitude } = user.location;
    const userId = user._id.toString();

    const month = dayjs().month() + 1;
    const prayTimes = await getPrayTime(
      latitude.toString(),
      longitude.toString(),
      month
    );
    if (!prayTimes) continue;

    for (const pt of prayTimes) {
      const existingDay = await Day.findOne({ userId, date: pt.date });
      if (!existingDay) {
        const fajrUTC = dayjs(pt.date + " " + pt.Fajr, "DD-MM-YYYY HH:mm")
          .utc()
          .toISOString();
        const maghribUTC = dayjs(pt.date + " " + pt.Maghrib, "DD-MM-YYYY HH:mm")
          .utc()
          .toISOString();

        await Day.create([
          {
            userId,
            date: pt.date,
            type: "morning",
            utcTime: fajrUTC,
            status: "pending",
          },
          {
            userId,
            date: pt.date,
            type: "evening",
            utcTime: maghribUTC,
            status: "pending",
          },
        ]);
      }
    }

    const days = await Day.find({ userId, status: "pending" });
    for (const day of days) {
      if (day.type === "morning") {
        await scheduleAzkarNotification(
          userId,
          user.telegramId,
          "Fajr",
          day.date,
          day.utcTime
        );
      } else if (day.type === "evening") {
        await scheduleAzkarNotification(
          userId,
          user.telegramId,
          "Maghrib",
          day.date,
          day.utcTime
        );
      }
    }
  }
}

export const azkarWorker = new Worker(
  "azkar",
  async (job) => {
    const { telegramId, prayer, date } = job.data as {
      telegramId: number;
      prayer: PrayerType;
      date: string;
    };
    await sendAzkarNotification(telegramId, prayer, date);
  },
  { connection, concurrency: 5 }
);

export async function postponeAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) await oldJob.remove();

  const delay = 60 * 60 * 1000;
  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );
}

export async function cancelAzkarNotification(
  userId: string,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) await oldJob.remove();
}

export function startPrayerTimesCron(): void {
  cron.schedule(
    "10 0 1 * *",
    async () => {
      try {
        await updatePrayerTimesAndSchedule();
      } catch (e) {
        console.error("Ошибка при обновлении расписания намазов:", e);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );
}
