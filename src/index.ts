import dotenv from "dotenv";
import mongoose from "mongoose";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, GrammyError, HttpError, NextFunction } from "grammy";
import { type MyConversationContext, type MyContext } from "./types";
import { messageHandler } from "./handlers/message";
import { commands } from "./config";
import {
  locationConversation,
  startConversation,
} from "./handlers/conversations";
import { hydrate } from "@grammyjs/hydrate";
import { menuButtons } from "./handlers/menu";

dotenv.config({ path: "src/.env", override: true });

const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ DB connected"))
  .catch((err) => {
    console.error("❌ DB connection failed", err);
    process.exit(1);
  });

bot.api.setMyCommands(commands);

bot.use(conversations<MyContext, MyConversationContext>());
commands.map((command) => {
  bot.command(command.command, async (ctx, next: NextFunction) => {
    await ctx.conversation.exitAll();
    return next();
  });
});
bot.use(createConversation(startConversation, { plugins: [hydrate()] }));
bot.use(createConversation(locationConversation, { plugins: [hydrate()] }));
bot.use(menuButtons);

commands.map((command) => {
  bot.command(command.command, command.action);
  bot.callbackQuery(command.command, command.action);
});

bot.on("message", messageHandler);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

bot.start();
