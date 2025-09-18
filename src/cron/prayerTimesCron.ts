import dayjs from "dayjs";
import Redis from "ioredis";
import cron from "node-cron";
import User from "../database/models/User";
import { getPrayTime } from "../shared/requests";
import { Queue, QueueEvents, Worker } from "bullmq";
import { sendAzkarNotification } from "../handlers/azkarNotification";
import Day from "../database/models/Day";

export async function updatePrayerTimesAndSchedule(
  telegramId?: number
): Promise<void> {
  try {
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

      try {
        const prayTime = await getPrayTime(
          latitude.toString(),
          longitude.toString()
        );
        if (!prayTime) continue;

        const fajrUTC = dayjs
          .unix(prayTime.date.timestamp)
          .tz(prayTime.meta.timezone)
          .hour(Number(prayTime.timings.Fajr.split(":")[0]))
          .minute(Number(prayTime.timings.Fajr.split(":")[1]))
          .utc()
          .toISOString();

        const maghribUTC = dayjs
          .unix(prayTime.date.timestamp)
          .tz(prayTime.meta.timezone)
          .hour(Number(prayTime.timings.Maghrib.split(":")[0]))
          .minute(Number(prayTime.timings.Maghrib.split(":")[1]))
          .utc()
          .toISOString();

        await User.findByIdAndUpdate(userId, {
          "timings.FajrUTC": fajrUTC,
          "timings.MaghribUTC": maghribUTC,
          date: prayTime.date,
          localTimings: prayTime.timings,
        });

        const prayers: PrayerType[] = ["Fajr", "Maghrib"];
        for (const prayer of prayers) {
          const runAt = dayjs(prayer === "Fajr" ? fajrUTC : maghribUTC);
          const date = runAt.format("YYYY-MM-DD");
          const runAtISO = runAt.toISOString();

          await scheduleAzkarNotification(
            userId,
            user.telegramId,
            prayer,
            date,
            runAtISO
          );
        }
      } catch (err) {
        console.error(
          `❌ Ошибка при обновлении времени намаза для ${user.telegramId}:`,
          err
        );
      }
    }

    console.log(
      `✅ Обновлены задачи напоминаний для ${users.length} пользователей`
    );
  } catch (err) {
    console.error("❌ Ошибка при обновлении расписания намазов:", err);
  }
}

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
    console.log(`⏩ Пропуск: ${userId} уже ${existing.status} ${type} азкары`);
    return;
  }

  const runAt = new Date(runAtISO).getTime();
  const now = Date.now();

  if (runAt <= now) {
    console.log(
      `⚠️ Пропущено планирование: время ${runAtISO} уже прошло (${prayer})`
    );
    return;
  }

  const delay = runAt - now;
  const jobId = jobKey(userId, prayer, date);

  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) {
    await oldJob.remove();
    console.log(`🗑️ Удалено старое задание ${jobId}`);
  }

  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );

  console.log(
    `✅ Запланировано ${prayer} для ${userId} на ${new Date(
      runAt
    ).toISOString()}`
  );
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
  if (oldJob) {
    await oldJob.remove();
    console.log(`🗑️ Старое задание ${jobId} удалено перед откладыванием`);
  }

  const delay = 60 * 60 * 1000;
  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );

  console.log(
    `⏰ Отложено ${prayer} для ${userId} на ${new Date(
      Date.now() + delay
    ).toISOString()}`
  );
}

export async function cancelAzkarNotification(
  userId: string,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  const oldJob = await azkarQueue.getJob(jobId);
  if (oldJob) {
    await oldJob.remove();
    console.log(`❌ Уведомление отменено: ${jobId}`);
  }
}

export function startPrayerTimesCron(): void {
  cron.schedule(
    "10 0 * * *",
    async () => {
      try {
        await updatePrayerTimesAndSchedule();
      } catch (e) {
        console.error("❌ Ошибка в cron при обновлении расписания:", e);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );
}
