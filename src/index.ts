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
import { Queue, QueueEvents, Worker } from "bullmq";
import Redis from "ioredis";
import { sendAzkarNotification } from "./handlers/azkarNotification";
import Day from "./database/models/Day";

dotenv.config({ path: "src/.env", override: true });

const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ База данных подключена успешно"))
  .catch((err) => {
    console.error("❌ Ошибка подключения к базе данных:", err);
    process.exit(1);
  });

bot.api.setMyCommands(commands);

bot.use(conversations<MyContext, MyConversationContext>());

commands.forEach((command) => {
  bot.command(command.command, async (ctx, next: NextFunction) => {
    await ctx.conversation.exitAll();
    return next();
  });
});

bot.use(createConversation(startConversation, { plugins: [hydrate()] }));
bot.use(createConversation(locationConversation, { plugins: [hydrate()] }));

bot.use(menuButtons);

commands.forEach((command) => {
  bot.command(command.command, command.action);
  bot.callbackQuery(command.command, command.action);
});

bot.on("callback_query", handleCallbackQuery);
bot.callbackQuery("menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📌 Главное меню\n\nВыберите действие:", {
    reply_markup: menuButtons,
  });
});
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

startPrayerTimesCron();

bot.start();
