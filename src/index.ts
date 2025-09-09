import dotenv from "dotenv";
import mongoose from "mongoose";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, GrammyError, HttpError, NextFunction } from "grammy";
import { type MyConversationContext, type MyContext } from "./types";
import { messageHandler } from "./handlers/message";
import { handleCallbackQuery } from "./handlers/callbackHandler";
import { commands } from "./config";
import {
  locationConversation,
  startConversation,
} from "./handlers/conversations";
import { hydrate } from "@grammyjs/hydrate";
import { menuButtons } from "./handlers/menu";
import { startPrayerTimesCron } from "./cron/prayerTimesCron";
import { JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import Redis from "ioredis";
import { sendAzkarNotification } from "./handlers/azkarNotification";
import Day from "./database/models/Day";

dotenv.config({ path: "src/.env", override: true });

const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

// Подключение MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ База данных подключена успешно"))
  .catch((err) => {
    console.error("❌ Ошибка подключения к базе данных:", err);
    process.exit(1);
  });

bot.api.setMyCommands(commands);

// Middleware и команды
bot.use(conversations<MyContext, MyConversationContext>());
bot.use(menuButtons);

commands.forEach((command) => {
  bot.command(command.command, async (ctx, next: NextFunction) => {
    await ctx.conversation.exitAll();
    return next();
  });
});

bot.use(createConversation(startConversation, { plugins: [hydrate()] }));
bot.use(createConversation(locationConversation, { plugins: [hydrate()] }));

commands.forEach((command) => {
  bot.command(command.command, command.action);
  bot.callbackQuery(command.command, command.action);
});

bot.on("callback_query", handleCallbackQuery);
bot.on("message", messageHandler);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Ошибка при обработке обновления ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("❌ Ошибка в Telegram API:", e.description);
  } else if (e instanceof HttpError) {
    console.error("❌ Ошибка сети при обращении к Telegram:", e);
  } else {
    console.error("❌ Неизвестная ошибка:", e);
  }
});

// 🔹 Локальный Redis (без TLS)
const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

export type PrayerType = "Fajr" | "Maghrib";

// Очередь и события
export const azkarQueue = new Queue("azkar", { connection });
export const azkarQueueEvents = new QueueEvents("azkar", { connection });

function jobKey(userId: string, prayer: PrayerType, date: string) {
  return `${userId}:${prayer}:${date}`;
}

// Планирование уведомления
export async function scheduleAzkarNotification(
  userId: string,
  telegramId: number,
  prayer: "Fajr" | "Maghrib",
  date: string,
  runAtISO: string,
  chatId?: number
): Promise<void> {
  const type = prayer === "Fajr" ? "morning" : "evening";

  const existing = await Day.findOne({ userId, date, type });
  if (existing && (existing.status === "skipped" || existing.status === "read"))
    return;

  const delay = Math.max(0, new Date(runAtISO).getTime() - Date.now());
  const jobId = jobKey(userId, prayer, date);

  const existingJob = await azkarQueue.getJob(jobId);
  if (existingJob) return;

  await azkarQueue.add(
    "send",
    { userId, telegramId, prayer, date, chatId },
    { jobId, delay, attempts: 3, removeOnComplete: true, removeOnFail: 50 }
  );
}

// Отложить уведомление
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
  } catch (err) {
    console.error(err);
  }

  const delay = 60 * 60 * 1000; // 1 час
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

// Отменить уведомление
export async function cancelAzkarNotification(
  userId: string,
  prayer: PrayerType,
  date: string
): Promise<void> {
  const jobId = jobKey(userId, prayer, date);
  try {
    await azkarQueue.remove(jobId);
  } catch (err) {
    console.error(err);
  }
}

// Worker
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
  { connection, concurrency: 5 }
);

// Запуск cron
startPrayerTimesCron();

// Запуск бота
bot.start();
