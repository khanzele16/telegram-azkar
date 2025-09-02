import dayjs from "dayjs";
import User from "../database/models/User";
import { type IUser } from "../types/models";
import { IPrayTime, type MyContext } from "../types";
import { CalendarService } from "../services/CalendarService";
import { generateCalendarMarkup } from "../shared/calendarMarkup";
import { getPrayTime } from "../shared/requests";

export const profileHandler = async (ctx: MyContext) => {
  try {
    const user: IUser | null = await User.findOne({ telegramId: ctx.from?.id });
    if (!user || !user.location) {
      await ctx.reply(
        "Вы не зарегистрированы. Используйте /start для регистрации."
      );
      return;
    }
    const pray: IPrayTime = await getPrayTime(
      user.location.latitude,
      user.location.longitude
    );
    console.log(pray)
    await ctx.reply(
      `${
        user?.username
          ? `<b>👤 Профиль — ${user.username}</b>\n\n🌅 Время утренних азкаров — ${user.timings?.Fajr}\n\n🌃 Время вечерних азкаров — ${user.timings?.Maghrib}`
          : `<b>👤 Ваш Профиль</b>\n\n`
      }`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("❌ Ошибка в обработчике профиля:", err);
  }
};

export const calendarHandler = async (ctx: MyContext) => {
  try {
    if (!ctx.from?.id || !ctx.callbackQuery?.message) return;

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user)
      return ctx.answerCallbackQuery({ text: "Вы не зарегистрированы" });

    const data = ctx.callbackQuery.data;
    let year = dayjs().year();
    let month = dayjs().month() + 1;

    if (data && data.startsWith("calendar:")) {
      const parts = data.split(":");
      if (parts.length === 3) {
        year = Number(parts[1]);
        month = Number(parts[2]);
      }
    }

    const calendar = await CalendarService.getMonthCalendar(
      user._id,
      year,
      month
    );
    const keyboard = generateCalendarMarkup(calendar, year, month);

    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error("calendarHandler error:", err);
    await ctx.answerCallbackQuery({ text: "Ошибка при обновлении календаря" });
  }
};
