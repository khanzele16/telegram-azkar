import Redis from "ioredis";
import dotenv from "dotenv";
import { Queue, Worker, JobsOptions, QueueEvents } from "bullmq";
import { sendAzkarNotification } from "../handlers/azkarNotification";

dotenv.config({ path: "src/.env" });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not set. Provide Upstash rediss:// URL in env.");
}

const connection = new Redis(redisUrl, {
  tls: {},
  maxRetriesPerRequest: null,
});

export type PrayerType = "Fajr" | "Maghrib";

export const azkarQueue = new Queue("azkar", { connection });
export const azkarQueueEvents = new QueueEvents("azkar", { connection });

function jobKey(userId: string, prayer: PrayerType, date: string) {
  return `${userId}:${prayer}:${date}`;
}

export async function scheduleAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string,
  runAtISO: string,
  chatId?: number
): Promise<void> {
  const delay = Math.max(0, new Date(runAtISO).getTime() - Date.now());
  const jobId = jobKey(userId, prayer, date);

  const opts: JobsOptions = {
    jobId,
    delay,
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: 50,
  };

  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date, chatId },
    opts
  );
}

export async function postponeAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string,
  chatId?: number
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);

  try {
    await azkarQueue.remove(jobId);
  } catch {}

  const delay = 60 * 60 * 1000;
  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date, chatId },
    {
      jobId,
      delay,
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}

export async function cancelAzkarNotification(
  userId: string,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  try {
    await azkarQueue.remove(jobId);
  } catch {}
}

export const azkarWorker = new Worker(
  "azkar",
  async (job) => {
    const { telegramId, prayer, date, chatId } = job.data as {
      telegramId: number;
      prayer: PrayerType;
      date: string;
      chatId?: number;
    };
    await sendAzkarNotification(telegramId, prayer, date, chatId);
  },
  { connection }
);
