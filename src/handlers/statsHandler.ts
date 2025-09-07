import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import User from "../database/models/User";
import { MyContext } from "../types";
import { InlineKeyboard } from "grammy";
import { StreakService } from "../services/StreakService";
import { CalendarService } from "../services/CalendarService";
import { generateCalendarMarkup } from "../shared/calendarMarkup";

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
    const calendar = await CalendarService.getMonthCalendar(user._id, currentYear, currentMonth); // только чтобы не было пусто
    const keyboard = generateCalendarMarkup(calendar, currentYear, currentMonth);

    await ctx.reply(statsMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("❌ Ошибка в statsHandler:", error);
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
    const keyboard = generateCalendarMarkup(calendar, year, month);

    await ctx.editMessageText("📊 <b>Статистика</b>", {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });

    await ctx.answerCallbackQuery(`📅 ${getMonthName(month)} ${year}`);
  } catch (error) {
    console.error("❌ Ошибка в handleCalendarNavigation:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при загрузке календаря");
  }
}

function formatProfileStats(stats: {
  currentStreak: number;
  lastReadAt?: Date;
  totalReadDays: number;
  totalSkippedDays: number;
}): string {
  let message = "<b>📊 Статистика</b>\n\n";

  message += `🔥 <b>Текущий стрик:</b> ${stats.currentStreak} дней\n\n`;

  if (stats.lastReadAt) {
    const lastRead = dayjs.utc(stats.lastReadAt).format("DD.MM.YYYY HH:mm");
    message += `📅 <b>Последнее чтение:</b> ${lastRead}\n\n`;
  } else {
    message += `📅 <b>Последнее чтение:</b> Никогда\n\n`;
  }
  message += `✅ Прочитано дней: ${stats.totalReadDays}\n`;
  message += `❌ Пропущено дней: ${stats.totalSkippedDays}\n`;

  return message;
}

function createCalendarKeyboard(year: number, month: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  keyboard
    .text("⏪", `calendar:${prevYear}:${prevMonth}`)
    .text(`${getMonthName(month)} ${year}`, `calendar:info`)
    .text("⏩", `calendar:${nextYear}:${nextMonth}`)
    .row()
    .text("📊 Обновить", `calendar:${year}:${month}`);

  return keyboard;
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
