// src/queue/azkarQueue.ts
import IORedis from "ioredis";
import dotenv from "dotenv";
import { Queue, Worker, JobsOptions, QueueEvents } from "bullmq";
import { sendAzkarNotification } from "../handlers/azkarNotification";

dotenv.config({ path: "src/.env" });

const connection = new IORedis(process.env.REDIS_URL as string, {
  tls: {}, // Включаем TLS для Upstash
  maxRetriesPerRequest: null, // обязательная настройка для BullMQ
});

export type PrayerType = "Fajr" | "Maghrib";

// Очередь и события очереди
export const azkarQueue = new Queue("azkar", { connection });
export const azkarQueueEvents = new QueueEvents("azkar", { connection });

// Генерация уникального ID для джоба
function jobKey(userId: string, prayer: PrayerType, date: string) {
  return `${userId}:${prayer}:${date}`;
}

// Планирование уведомления
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

  await azkarQueue.add("send", { userId, telegramId, prayer, date, chatId }, opts);
}

// Отложить уведомление на 1 час
export async function postponeAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: PrayerType,
  date: string,
  chatId?: number
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);

  try { await azkarQueue.remove(jobId); } catch {}

  const delay = 60 * 60 * 1000; // 1 час
  await azkarQueue.add("send", { userId, telegramId, prayer, date, chatId }, {
    jobId,
    delay,
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: 50,
  });
}

// Отменить уведомление
export async function cancelAzkarNotification(
  userId: string,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  try { await azkarQueue.remove(jobId); } catch {}
}

// Worker для обработки уведомлений
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