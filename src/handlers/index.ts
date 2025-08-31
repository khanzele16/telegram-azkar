import User from "../database/models/User";
import { type MyContext } from "../types";

export const profileHandler = async (ctx: MyContext) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Используйте /start для регистрации."
      );
      return;
    }
    await ctx.reply(
      `${
        user?.username
          ? `<b>👤 Профиль — ${user.username}</b>`
          : `<b>👤 Ваш Профиль</b>`
      }`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("❌ Ошибка в обработчике профиля:", error);
  }
};
