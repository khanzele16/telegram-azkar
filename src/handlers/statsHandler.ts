import { MyContext } from "../types";
import { StreakService } from "../services/streakService";
import { CalendarService } from "../services/CalendarService";
import User from "../database/models/User";
import { InlineKeyboard } from "grammy";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export async function statsHandler(ctx: MyContext): Promise<void> {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Ошибка: не удалось определить пользователя");
      return;
    }

    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply("❌ Пользователь не найден. Используйте /start для регистрации.");
      return;
    }
    const stats = await StreakService.getProfileStats(user._id);
    
    const now = dayjs.utc();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;
    const calendar = await CalendarService.getMonthCalendar(user._id, currentYear, currentMonth);
    
    // Форматируем статистику
    const statsMessage = formatProfileStats(stats);
    
    // Форматируем календарь
    const calendarMessage = formatCalendar(calendar, currentYear, currentMonth);
    
    // Создаем клавиатуру для навигации по месяцам
    const keyboard = createCalendarKeyboard(currentYear, currentMonth);
    
    // Отправляем статистику с календарем
    await ctx.reply(
      `${statsMessage}\n\n${calendarMessage}`,
      { 
        reply_markup: keyboard,
        parse_mode: "HTML" 
      }
    );
    
  } catch (error) {
    console.error("❌ Ошибка в statsHandler:", error);
    await ctx.reply("❌ Произошла ошибка при загрузке статистики");
  }
}

// Обработчик для навигации по календарю
export async function handleCalendarNavigation(ctx: MyContext, year: number, month: number): Promise<void> {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCallbackQuery("❌ Ошибка: не удалось определить пользователя");
      return;
    }

    // Находим пользователя
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.answerCallbackQuery("❌ Пользователь не найден");
      return;
    }

    // Получаем календарь для указанного месяца
    const calendar = await CalendarService.getMonthCalendar(user._id, year, month);
    
    // Форматируем календарь
    const calendarMessage = formatCalendar(calendar, year, month);
    
    // Создаем клавиатуру для навигации
    const keyboard = createCalendarKeyboard(year, month);
    
    // Обновляем сообщение
    await ctx.editMessageText(
      `📊 <b>Статистика</b>\n\n${calendarMessage}`,
      { 
        reply_markup: keyboard,
        parse_mode: "HTML" 
      }
    );
    
    await ctx.answerCallbackQuery(`📅 ${getMonthName(month)} ${year}`);
    
  } catch (error) {
    console.error("❌ Ошибка в handleCalendarNavigation:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при загрузке календаря");
  }
}

// Функция форматирования статистики профиля
function formatProfileStats(stats: {
  currentStreak: number;
  lastReadAt?: Date;
  totalReadDays: number;
  totalSkippedDays: number;
}): string {
  let message = "<b>📊 Статистика</b>\n\n";
  
  // Текущий стрик
  message += `🔥 <b>Текущий стрик:</b> ${stats.currentStreak} дней\n\n`;
  
  // Последнее чтение
  if (stats.lastReadAt) {
    const lastRead = dayjs.utc(stats.lastReadAt).format("DD.MM.YYYY HH:mm");
    message += `📅 <b>Последнее чтение:</b> ${lastRead}\n\n`;
  } else {
    message += `📅 <b>Последнее чтение:</b> Никогда\n\n`;
  }
  
  // Общая статистика
  message += `📈 <b>Общая статистика:</b>\n`;
  message += `   ✅ Прочитано дней: ${stats.totalReadDays}\n`;
  message += `   ❌ Пропущено дней: ${stats.totalSkippedDays}\n\n`;
  
  return message;
}

// Функция форматирования календаря
function formatCalendar(calendar: Array<{ date: string; status: string }>, year: number, month: number): string {
  let message = `<b>🗓 Календарь ${getMonthName(month)} ${year}</b>\n\n`;
  
  // Группируем дни по неделям
  const weeks: Array<Array<{ date: string; status: string }>> = [];
  let currentWeek: Array<{ date: string; status: string }> = [];
  
  calendar.forEach((day, index) => {
    currentWeek.push(day);
    
    // Новая неделя начинается с понедельника (индекс 0 = понедельник)
    const dayOfWeek = dayjs.utc(day.date).day();
    if (dayOfWeek === 0 || index === calendar.length - 1) { // Воскресенье или последний день месяца
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // Форматируем каждую неделю
  weeks.forEach((week, weekIndex) => {
    message += `Неделя ${weekIndex + 1}:\n`;
    
    week.forEach(day => {
      const dayNumber = dayjs.utc(day.date).date();
      const statusEmoji = getStatusEmoji(day.status);
      message += `${statusEmoji} ${dayNumber.toString().padStart(2, '0')} `;
    });
    
    message += "\n\n";
  });
  
  return message;
}

// Функция создания клавиатуры для календаря
function createCalendarKeyboard(year: number, month: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Кнопки навигации по месяцам
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

// Функция получения названия месяца
function getMonthName(month: number): string {
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  return months[month - 1];
}

// Функция получения эмодзи для статуса
function getStatusEmoji(status: string): string {
  switch (status) {
    case "read":
      return "✅";
    case "skipped":
      return "❌";
    case "postponed":
      return "⏰";
    case "pending":
      return "⏳";
    default:
      return "⚪";
  }
} 