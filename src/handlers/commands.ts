import { register } from "../database/controllers/auth";
import User from "../database/models/User";
import { toMenuKeyboard } from "../shared/keyboards";
import { type MyContext } from "../types";
import { menuButtons } from "./menu";

export const start = async (ctx: MyContext) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("Ошибка: не удалось определить пользователя");
      return;
    }
    const isRegistered: Boolean = await register(ctx);
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
    await ctx.reply("📌 <b>Главное меню</b>\n\nВыберите действие:", {
      reply_markup: menuButtons,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error in menu command:", error);
    await ctx.reply("Произошла ошибка при открытии меню. Попробуйте позже.");
  }
};

export const help = async (ctx: MyContext, withKeyboard?: boolean) => {
  try {
    if (withKeyboard === true) {
      await ctx.reply(
        "<b>❓ Помощь</b>\n\nЕсли возникли какие-то трудности, то пишите @khanzele",
        { parse_mode: "HTML", reply_markup: toMenuKeyboard }
      );
      return;
    }
    await ctx.reply(
      "<b>❓ Помощь</b>\n\nЕсли возникли какие-то трудности, то пишите @khanzele",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in help command:", error);
    await ctx.reply("Произошла ошибка при отображении справки.");
  }
};
