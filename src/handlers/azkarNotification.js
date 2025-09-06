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
exports.sendAzkarNotification = sendAzkarNotification;
exports.handleAzkarNotifyCallback = handleAzkarNotifyCallback;
exports.handleSliderCallback = handleSliderCallback;
const grammy_1 = require("grammy");
const User_1 = __importDefault(require("../database/models/User"));
const Azkar_1 = __importDefault(require("../database/models/Azkar"));
const Reading_1 = __importDefault(require("../database/models/Reading"));
const streakService_1 = require("../services/streakService");
const azkarQueue_1 = require("../queue/azkarQueue");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "src/.env" });
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
function sendAzkarNotification(telegramId, prayer, date, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetChatId = chatId || telegramId;
        const keyboard = new grammy_1.InlineKeyboard()
            .text("📖 Прочитать", `azkarnotify:read:${prayer}:${date}`)
            .text("⏰ Отложить (1 ч)", `azkarnotify:postpone:${prayer}:${date}`)
            .row()
            .text("❌ Сегодня не буду", `azkarnotify:skip:${prayer}:${date}`);
        yield bot.api.sendMessage(targetChatId, `🕌 Время ${prayer === "Fajr" ? "утренних" : "вечерних"} азкаров.`, { reply_markup: keyboard });
        const user = yield User_1.default.findOne({ telegramId });
        if (user) {
            yield Reading_1.default.findOneAndUpdate({ userId: user._id, date }, { status: "pending", startedAt: new Date() }, { upsert: true });
        }
    });
}
const sliderStates = new Map();
function startAzkarSlider(ctx, userId, chatId, prayer, date) {
    return __awaiter(this, void 0, void 0, function* () {
        const azkar = yield Azkar_1.default.aggregate([
            { $match: { category: prayer.toLowerCase() } },
            { $sample: { size: 10 } },
        ]);
        if (azkar.length === 0) {
            yield ctx.api.sendMessage(chatId, "Нет азкаров для отображения");
            return;
        }
        const sliderId = `${ctx.from.id}:${Date.now()}`;
        sliderStates.set(sliderId, {
            azkarIds: azkar.map((a) => a._id),
            index: 0,
            date,
            userId,
            chatId,
        });
        const keyboard = buildSliderKeyboard(sliderId, 0, azkar.length);
        yield ctx.api.sendMessage(chatId, formatAzkarMessage(azkar[0], 1, azkar.length), { reply_markup: keyboard, parse_mode: "HTML" });
    });
}
function buildSliderKeyboard(sliderId, index, total) {
    return new grammy_1.InlineKeyboard()
        .text("⏪", `slider:${sliderId}:prev`)
        .text(`${index + 1}/${total}`, `slider:${sliderId}:info`)
        .text("⏩", `slider:${sliderId}:next`)
        .row()
        .text("+1", `slider:${sliderId}:plus`)
        .text("✅ Завершить", `slider:${sliderId}:finish`);
}
function formatAzkarMessage(azkar, i, total) {
    let msg = `<b>📖 Азкар ${i}/${total}</b>\n\n`;
    msg += `<b>Текст:</b>\n${azkar.text}\n\n`;
    if (azkar.translation)
        msg += `<b>Перевод:</b>\n${azkar.translation}\n\n`;
    if (azkar.transcription)
        msg += `<b>Транскрипция:</b>\n${azkar.transcription}\n\n`;
    if (azkar.audio)
        msg += `🔊 <i>Доступно аудио</i>`;
    return msg;
}
function handleAzkarNotifyCallback(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = (_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.data;
        if (!data) {
            yield ctx.answerCallbackQuery("❌ Некорректные данные");
            return;
        }
        const [, action, prayer, date] = data.split(":");
        const user = yield User_1.default.findOne({ telegramId: ctx.from.id });
        if (!user) {
            yield ctx.answerCallbackQuery("❌ Пользователь не найден");
            return;
        }
        if (action === "postpone") {
            yield (0, azkarQueue_1.postponeAzkarNotification)(user._id.toString(), ctx.from.id, prayer, date, ctx.chat.id);
            yield ctx.answerCallbackQuery("⏰ Отложено на 1 час");
            return;
        }
        if (action === "skip") {
            yield (0, azkarQueue_1.cancelAzkarNotification)(user._id.toString(), prayer, date);
            yield streakService_1.StreakService.markSkipped(user._id, date);
            yield ctx.answerCallbackQuery("День отмечен как пропущенный");
            return;
        }
        if (action === "read") {
            yield startAzkarSlider(ctx, user._id, ctx.chat.id, prayer, date);
            yield ctx.answerCallbackQuery();
            return;
        }
        yield ctx.answerCallbackQuery("❌ Неизвестное действие");
    });
}
function handleSliderCallback(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = (_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.data;
        if (!data) {
            yield ctx.answerCallbackQuery("❌ Некорректные данные");
            return;
        }
        const [, sliderId, action] = data.split(":");
        const state = sliderStates.get(sliderId);
        if (!state) {
            yield ctx.answerCallbackQuery("Слайдер устарел");
            return;
        }
        const total = state.azkarIds.length;
        if (action === "prev") {
            state.index = Math.max(0, state.index - 1);
        }
        else if (action === "next") {
            state.index = Math.min(total - 1, state.index + 1);
        }
        else if (action === "plus") {
            const azkarId = state.azkarIds[state.index];
            yield streakService_1.StreakService.markRead(state.userId, state.date, azkarId);
            yield ctx.answerCallbackQuery("+1 записан");
        }
        else if (action === "finish") {
            sliderStates.delete(sliderId);
            yield ctx.answerCallbackQuery("Завершено");
            return;
        }
        const azkar = yield Azkar_1.default.findById(state.azkarIds[state.index]);
        if (!azkar) {
            yield ctx.answerCallbackQuery("❌ Ошибка загрузки");
            return;
        }
        const kb = buildSliderKeyboard(sliderId, state.index, total);
        yield ctx.editMessageText(formatAzkarMessage(azkar, state.index + 1, total), { reply_markup: kb, parse_mode: "HTML" });
    });
}
