import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import User from "../database/models/User";
import { IPrayTime, MyContext, MyConversationContext } from "../types";
import { StreakService } from "../services/StreakService";
import { CalendarService } from "../services/CalendarService";
import { generateCalendarMarkup } from "../shared/calendarMarkup";
import { getPrayTime } from "../shared/requests";
import { register } from "../database/controllers/auth";
import { start } from "./commands";

dayjs.extend(utc);

export async function statsHandler(ctx: MyContext): Promise<void> {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Ошибка: не удалось определить пользователя");
      return;
    }

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(
        "❌ Пользователь не найден. Используйте /start для регистрации."
      );
      return;
    }
    
    const stats = await StreakService.getProfileStats(user._id);
    const statsMessage = formatProfileStats(stats);
    
    const now = dayjs.utc();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;
    const calendar = await CalendarService.getMonthCalendar(
      user._id,
      currentYear,
      currentMonth
    );

    const keyboard = generateCalendarMarkup(
      calendar,
      currentYear,
      currentMonth
    );

    await ctx.reply(statsMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("❌ Ошибка в stats:", error);
    await ctx.reply("❌ Произошла ошибка при загрузке статистики");
  }
}

export async function handleCalendarNavigation(
  ctx: MyContext,
  year: number,
  month: number
): Promise<void> {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCallbackQuery(
        "❌ Ошибка: не удалось определить пользователя"
      );
      return;
    }

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.answerCallbackQuery("❌ Пользователь не найден");
      return;
    }

    const calendar = await CalendarService.getMonthCalendar(
      user._id,
      year,
      month
    );
    const stats = await StreakService.getProfileStats(user._id);
    const statsMessage = formatProfileStats(stats);
    const keyboard = generateCalendarMarkup(calendar, year, month);

    await ctx.editMessageText(statsMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });

    await ctx.answerCallbackQuery(`📅 ${getMonthName(month)} ${year}`);
  } catch (error) {
    console.error("❌ Ошибка в handleCalendarNavigation:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при загрузке календаря");
  }
}

function formatProfileStats(
  stats: Awaited<ReturnType<typeof StreakService.getProfileStats>>
): string {
  return `📊 <b>Ваша статистика:</b>\n
🌅 Утренние: <b>${stats.morningRead}</b> дней (пропущено: ${
    stats.morningSkipped
  })
🌇 Вечерние: <b>${stats.eveningRead}</b> дней (пропущено: ${
    stats.eveningSkipped
  })
🔥 Стрик: <b>${stats.streak}</b> дней
${stats.lastReadAt ? "📖 Последнее чтение: " + stats.lastReadAt : ""}`;
}

function getMonthName(month: number): string {
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  return months[month - 1];
}

export async function profileHandler(ctx: MyContext): Promise<void> {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Ошибка: не удалось определить пользователя");
      return;
    }

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply(
        "❌ Вы не зарегистрированы. Используйте /start для регистрации."
      );
      return;
    }

    const isRegistered: boolean = await register(ctx);
    if (
      !isRegistered ||
      !user.location?.latitude ||
      !user.location?.longitude
    ) {
      await start(ctx);
      return;
    }

    const stats = await StreakService.getProfileStats(user._id);

    const today = dayjs().format("DD-MM-YYYY");
    const prayTimes: IPrayTime[] | null = await getPrayTime(
      user.location.latitude.toString(),
      user.location.longitude.toString(),
      dayjs().month() + 1
    );

    const todayPrayTime = prayTimes?.find((pt) => pt.date === today);

    await ctx.reply(
      `<b>👤 Профиль — ${user.username || "Ваш"}</b>\n\n🌅 Утренний намаз: ${
        todayPrayTime?.Fajr || "-"
      }\n🌃 Послеобеденный намаз: ${
        todayPrayTime?.Asr || "-"
      }\n\n🌅 Утренние: <b>${stats.morningRead}</b> дней (пропущено: ${
        stats.morningSkipped
      })\n🌇 Вечерние: <b>${stats.eveningRead}</b> дней (пропущено: ${
        stats.eveningSkipped
      })`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("❌ Ошибка в profileHandler:", error);
    await ctx.reply("❌ Произошла ошибка при загрузке профиля");
  }
}

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
