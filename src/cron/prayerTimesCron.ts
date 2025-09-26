import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import Redis from "ioredis";
import cron from "node-cron";
import User from "../database/models/User";
import Day from "../database/models/Day";
import { getPrayTime } from "../shared/requests";
import { Queue, QueueEvents, Worker } from "bullmq";
import { sendAzkarNotification, sendAzkarNotify } from "../handlers/azkarNotification";

dayjs.extend(utc);
dayjs.extend(timezone);

const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

export type PrayerType = "Fajr" | "Maghrib";

export const azkarQueue = new Queue("azkar", { connection });
export const azkarQueueEvents = new QueueEvents("azkar", { connection });

function jobKey(userId: string, prayer: PrayerType, date: string) {
  return `${userId}:${prayer}:${date}`;
}

export async function scheduleAzkarNotify(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string,
  runAtISO: string
): Promise<void> {
  const runAt = dayjs(runAtISO).utc();
  const now = dayjs().utc();
  const delay = runAt.diff(now);

  const jobId = `${userId}:${prayer}:${date}`;
  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) await oldJob.remove();

  await azkarQueue.add(
    "notify",
    { telegramId, prayer, date, utcTime: runAt.toISOString(), notify: true },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );
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

  const runAt = dayjs(runAtISO).utc();
  const now = dayjs().utc();

  if (runAt.isBefore(now)) {
    console.log(`Time for ${prayer} on ${date} has passed for user ${userId}`);
    return;
  }

  const delay = runAt.diff(now);
  const jobId = jobKey(userId, prayer, date);

  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) await oldJob.remove();

  await azkarQueue.add(
    "send",
    {
      userId,
      telegramId,
      prayer,
      date,
      utcTime: runAt.toISOString(),
      notify: false,
    },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );
}

export async function updatePrayerTimesAndSchedule(
  addNextMonth: boolean,
  telegramId?: number
): Promise<void> {
  const users = telegramId
    ? await User.find({ telegramId })
    : await User.find({
        "location.latitude": { $exists: true },
        "location.longitude": { $exists: true },
        blocked: false,
      });

  for (const user of users) {
    if (!user.location) continue;
    const { latitude, longitude } = user.location;
    const userId = user._id.toString();
    let prayTimes;

    if (addNextMonth) {
      const month = dayjs().month() + 1;
      const secondMonth = dayjs().month() + 2;
      prayTimes = await getPrayTime(
        latitude.toString(),
        longitude.toString(),
        month,
        secondMonth
      );
    } else {
      const month = dayjs().month() + 1;
      prayTimes = await getPrayTime(
        latitude.toString(),
        longitude.toString(),
        month
      );
    }

    if (!prayTimes) continue;

    const timingsToAdd = prayTimes.map((pt) => {
      const [day, mm, year] = pt.date.split("-");
      const formattedDate = `${year}-${mm}-${day}`;
      const fajrDayjs = dayjs.tz(
        `${formattedDate} ${pt.Fajr}`,
        "YYYY-MM-DD HH:mm",
        pt.timezone
      );
      const maghribDayjs = dayjs.tz(
        `${formattedDate} ${pt.Maghrib}`,
        "YYYY-MM-DD HH:mm",
        pt.timezone
      );

      if (!fajrDayjs.isValid() || !maghribDayjs.isValid()) {
        console.error("Invalid date parsing in cron:", {
          date: pt.date,
          fajr: pt.Fajr,
          maghrib: pt.Maghrib,
          formattedDate,
          fajrValid: fajrDayjs.isValid(),
          maghribValid: maghribDayjs.isValid(),
        });
        throw new Error(`Invalid date format: ${pt.date}`);
      }

      const fajrUTC = fajrDayjs.utc().toISOString();
      const maghribUTC = maghribDayjs.utc().toISOString();
      return {
        timezone: pt.timezone,
        date: pt.date,
        FajrUTC: fajrUTC,
        MaghribUTC: maghribUTC,
      };
    });

    for (const timing of timingsToAdd) {
      await User.updateOne(
        { _id: user._id, "timings.date": { $ne: timing.date } },
        { $push: { timings: timing } }
      );
    }

    for (const timing of timingsToAdd) {
      const existingDayMorning = await Day.findOne({
        userId,
        date: timing.date,
        type: "morning",
      });
      const existingDayEvening = await Day.findOne({
        userId,
        date: timing.date,
        type: "evening",
      });

      if (!existingDayMorning) {
        await Day.create({
          userId,
          date: timing.date,
          type: "morning",
          utcTime: timing.FajrUTC,
          status: "pending",
          timezone: timing.timezone,
        });
      }
      if (!existingDayEvening) {
        await Day.create({
          userId,
          date: timing.date,
          type: "evening",
          utcTime: timing.MaghribUTC,
          status: "pending",
          timezone: timing.timezone,
        });
      }
    }

    const pendingDays = await Day.find({ userId, status: "pending" });
    for (const day of pendingDays) {
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
    const { telegramId, prayer, date, utcTime, notify } = job.data as {
      telegramId: number;
      prayer: PrayerType;
      date: string;
      utcTime: string;
      notify?: boolean;
    };
    
    if (notify) {
      await sendAzkarNotify(telegramId, prayer, date);
    } else {
      await sendAzkarNotification(telegramId, prayer, date);
    }
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
    { userId, telegramId, prayer, date, utcTime: new Date().toISOString(), notify: false },
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
    "10 0 26 * *",
    async () => {
      try {
        await updatePrayerTimesAndSchedule(true);
      } catch (e) {
        console.error("Ошибка при обновлении расписания намазов:", e);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );
}
