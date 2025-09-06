"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsHandler = statsHandler;
exports.handleCalendarNavigation = handleCalendarNavigation;
const streakService_1 = require("../services/streakService");
const CalendarService_1 = require("../services/CalendarService");
const User_1 = __importDefault(require("../database/models/User"));
const grammy_1 = require("grammy");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
dayjs_1.default.extend(utc_1.default);
function statsHandler(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id)) {
                yield ctx.reply("❌ Ошибка: не удалось определить пользователя");
                return;
            }
            const user = yield User_1.default.findOne({ telegramId: ctx.from.id });
            if (!user) {
                yield ctx.reply("❌ Пользователь не найден. Используйте /start для регистрации.");
                return;
            }
            const stats = yield streakService_1.StreakService.getProfileStats(user._id);
            const now = dayjs_1.default.utc();
            const currentYear = now.year();
            const currentMonth = now.month() + 1;
            const calendar = yield CalendarService_1.CalendarService.getMonthCalendar(user._id, currentYear, currentMonth);
            const statsMessage = formatProfileStats(stats);
            const calendarMessage = formatCalendar(calendar, currentYear, currentMonth);
            const keyboard = createCalendarKeyboard(currentYear, currentMonth);
            yield ctx.reply(`${statsMessage}\n\n${calendarMessage}`, {
                reply_markup: keyboard,
                parse_mode: "HTML"
            });
        }
        catch (error) {
            console.error("❌ Ошибка в statsHandler:", error);
            yield ctx.reply("❌ Произошла ошибка при загрузке статистики");
        }
    });
}
function handleCalendarNavigation(ctx, year, month) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id)) {
                yield ctx.answerCallbackQuery("❌ Ошибка: не удалось определить пользователя");
                return;
            }
            const user = yield User_1.default.findOne({ telegramId: ctx.from.id });
            if (!user) {
                yield ctx.answerCallbackQuery("❌ Пользователь не найден");
                return;
            }
            const calendar = yield CalendarService_1.CalendarService.getMonthCalendar(user._id, year, month);
            const calendarMessage = formatCalendar(calendar, year, month);
            const keyboard = createCalendarKeyboard(year, month);
            yield ctx.editMessageText(`📊 <b>Статистика</b>\n\n${calendarMessage}`, {
                reply_markup: keyboard,
                parse_mode: "HTML"
            });
            yield ctx.answerCallbackQuery(`📅 ${getMonthName(month)} ${year}`);
        }
        catch (error) {
            console.error("❌ Ошибка в handleCalendarNavigation:", error);
            yield ctx.answerCallbackQuery("❌ Ошибка при загрузке календаря");
        }
    });
}
function formatProfileStats(stats) {
    let message = "<b>📊 Статистика</b>\n\n";
    message += `🔥 <b>Текущий стрик:</b> ${stats.currentStreak} дней\n\n`;
    if (stats.lastReadAt) {
        const lastRead = dayjs_1.default.utc(stats.lastReadAt).format("DD.MM.YYYY HH:mm");
        message += `📅 <b>Последнее чтение:</b> ${lastRead}\n\n`;
    }
    else {
        message += `📅 <b>Последнее чтение:</b> Никогда\n\n`;
    }
    message += `📈 <b>Общая статистика:</b>\n`;
    message += `   ✅ Прочитано дней: ${stats.totalReadDays}\n`;
    message += `   ❌ Пропущено дней: ${stats.totalSkippedDays}\n\n`;
    return message;
}
function formatCalendar(calendar, year, month) {
    let message = `<b>🗓 Календарь ${getMonthName(month)} ${year}</b>\n\n`;
    const weeks = [];
    let currentWeek = [];
    calendar.forEach((day, index) => {
        currentWeek.push(day);
        const dayOfWeek = dayjs_1.default.utc(day.date).day();
        if (dayOfWeek === 0 || index === calendar.length - 1) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }
    });
    weeks.forEach((week, weekIndex) => {
        message += `Неделя ${weekIndex + 1}:\n`;
        week.forEach(day => {
            const dayNumber = dayjs_1.default.utc(day.date).date();
            const statusEmoji = getStatusEmoji(day.status);
            message += `${statusEmoji} ${dayNumber.toString().padStart(2, '0')} `;
        });
        message += "\n\n";
    });
    return message;
}
function createCalendarKeyboard(year, month) {
    const keyboard = new grammy_1.InlineKeyboard();
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
function getMonthName(month) {
    const months = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];
    return months[month - 1];
}
function getStatusEmoji(status) {
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
