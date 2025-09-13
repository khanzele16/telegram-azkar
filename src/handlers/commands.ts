import User from "../database/models/User";
import { register } from "../database/controllers/auth";
import { type MyContext } from "../types";
import { menuButtons } from "./menu";
import { profileHandler } from "./index";
import { statsHandler } from "./statsHandler";

export const start = async (ctx: MyContext) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("Ошибка: не удалось определить пользователя");
      return;
    }
    const isRegistered: boolean = await register(ctx);
    if (isRegistered) {
      await menu(ctx);
    } else {
      await ctx.conversation.enter("startConversation");
    }
  } catch (error) {
    console.error("Error in start command:", error);
    await ctx.reply("Произошла ошибка при запуске бота. Попробуйте позже.");
  }
};

export const menu = async (ctx: MyContext) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("Ошибка: не удалось определить пользователя");
      return;
    }
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Используйте /start для регистрации."
      );
      return;
    }
    if (!user.location?.latitude || !user.location?.longitude) {
      await ctx.reply("Вы не установили местоположение");
      await ctx.conversation.enter("locationConversation");
      return;
    }
    await ctx.reply("📌 Главное меню\n\nВыберите действие:", {
      reply_markup: menuButtons,
    });
  } catch (error) {
    console.error("Error in menu command:", error);
    await ctx.reply("Произошла ошибка при открытии меню. Попробуйте позже.");
  }
};

export const stats = async (ctx: MyContext) => {
  try {
    await statsHandler(ctx);
  } catch (error) {
    console.error("Error in stats command:", error);
    await ctx.reply(
      "Произошла ошибка при загрузке статистики. Попробуйте позже."
    );
  }
};

export const location = async (ctx: MyContext) => {
  try {
    await ctx.conversation.enter("locationConversation");
  } catch (error) {
    console.error("Error in location command:", error);
    await ctx.reply(
      "Произошла ошибка при установке геолокации. Попробуйте позже."
    );
  }
};

export const profile = async (ctx: MyContext) => {
  try {
    await profileHandler(ctx);
  } catch (error) {
    console.error("Error in profile command:", error);
    await ctx.reply("Произошла ошибка при загрузке профиля. Попробуйте позже.");
  }
};

export const help = async (ctx: MyContext) => {
  try {
    await ctx.reply(
      "<b>Помощь</b>\n\nЕсли возникли какие-то трудности, то пишите @khanzele",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in help command:", error);
    await ctx.reply("Произошла ошибка при отображении справки.");
  }
};
