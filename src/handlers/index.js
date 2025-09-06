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
exports.calendarHandler = exports.profileHandler = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const User_1 = __importDefault(require("../database/models/User"));
const CalendarService_1 = require("../services/CalendarService");
const calendarMarkup_1 = require("../shared/calendarMarkup");
const requests_1 = require("../shared/requests");
const profileHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = yield User_1.default.findOne({ telegramId: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id });
        if (!user || !user.location) {
            yield ctx.reply("Вы не зарегистрированы. Используйте /start для регистрации.");
            return;
        }
        const pray = yield (0, requests_1.getPrayTime)(user.location.latitude, user.location.longitude);
        console.log(pray);
        yield ctx.reply(`${(user === null || user === void 0 ? void 0 : user.username)
            ? `<b>👤 Профиль — ${user.username}</b>\n\n🌅 Время утренних азкаров — ${(_b = user.timings) === null || _b === void 0 ? void 0 : _b.Fajr}\n\n🌃 Время вечерних азкаров — ${(_c = user.timings) === null || _c === void 0 ? void 0 : _c.Maghrib}`
            : `<b>👤 Ваш Профиль</b>\n\n`}`, { parse_mode: "HTML" });
    }
    catch (err) {
        console.error("❌ Ошибка в обработчике профиля:", err);
    }
});
exports.profileHandler = profileHandler;
const calendarHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id) || !((_b = ctx.callbackQuery) === null || _b === void 0 ? void 0 : _b.message))
            return;
        const user = yield User_1.default.findOne({ telegramId: ctx.from.id });
        if (!user)
            return ctx.answerCallbackQuery({ text: "Вы не зарегистрированы" });
        const data = ctx.callbackQuery.data;
        let year = (0, dayjs_1.default)().year();
        let month = (0, dayjs_1.default)().month() + 1;
        if (data && data.startsWith("calendar:")) {
            const parts = data.split(":");
            if (parts.length === 3) {
                year = Number(parts[1]);
                month = Number(parts[2]);
            }
        }
        const calendar = yield CalendarService_1.CalendarService.getMonthCalendar(user._id, year, month);
        const keyboard = (0, calendarMarkup_1.generateCalendarMarkup)(calendar, year, month);
        yield ctx.editMessageReplyMarkup({ reply_markup: keyboard });
        yield ctx.answerCallbackQuery();
    }
    catch (err) {
        console.error("calendarHandler error:", err);
        yield ctx.answerCallbackQuery({ text: "Ошибка при обновлении календаря" });
    }
});
exports.calendarHandler = calendarHandler;
