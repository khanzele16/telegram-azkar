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

startPrayerTimesCron();

bot.start();
