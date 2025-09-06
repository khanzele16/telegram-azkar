"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCalendarMarkup = void 0;
const grammy_1 = require("grammy");
const dayjs_1 = __importDefault(require("dayjs"));
const weekday_1 = __importDefault(require("dayjs/plugin/weekday"));
const isoWeek_1 = __importDefault(require("dayjs/plugin/isoWeek"));
require("dayjs/locale/ru");
dayjs_1.default.extend(weekday_1.default);
dayjs_1.default.extend(isoWeek_1.default);
dayjs_1.default.locale('ru');
const generateCalendarMarkup = (calendar, year, month) => {
    const kb = new grammy_1.InlineKeyboard();
    const currentMonth = (0, dayjs_1.default)(`${year}-${month}-01`);
    const prevMonth = currentMonth.subtract(1, "month");
    const nextMonth = currentMonth.add(1, "month");
    kb.text("⬅️", `calendar:${prevMonth.year()}:${prevMonth.month() + 1}`);
    kb.text(currentMonth.format("MMMM YYYY"), "noop");
    kb.text("➡️", `calendar:${nextMonth.year()}:${nextMonth.month() + 1}`);
    kb.row();
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((d) => kb.text(d, "empty"));
    kb.row();
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const startWeekday = startOfMonth.isoWeekday();
    const daysInMonth = endOfMonth.date();
    let col = 0;
    for (let i = 1; i < startWeekday; i++) {
        kb.text(" ", "empty");
        col++;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = currentMonth.date(day).format("YYYY-MM-DD");
        const reading = calendar.find((r) => r.date === date);
        let emoji = "";
        if ((reading === null || reading === void 0 ? void 0 : reading.status) === "read")
            emoji = "✅";
        if ((reading === null || reading === void 0 ? void 0 : reading.status) === "skipped")
            emoji = "❌";
        if ((reading === null || reading === void 0 ? void 0 : reading.status) === "postponed")
            emoji = "⏸";
        kb.text(`${day} ${emoji}`, `day:${year}:${month}:${day}`);
        col++;
        if (col === 7) {
            kb.row();
            col = 0;
        }
    }
    if (col > 0) {
        for (; col < 7; col++) {
            kb.text(" ", "empty");
        }
        kb.row();
    }
    return kb;
};
exports.generateCalendarMarkup = generateCalendarMarkup;
