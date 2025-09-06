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
exports.locationConversation = exports.startConversation = void 0;
const User_1 = __importDefault(require("../database/models/User"));
const keyboards_1 = require("../shared/keyboards");
const requests_1 = require("../shared/requests");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
dayjs_1.default.extend(utc_1.default);
const startConversation = (conversation, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const ctx_message = yield ctx.reply("<b>Ассаляму Алейкум ва Рахматуллахи ва Баракатуh!</b>\n\nМир, милость и благословение Аллаха да будут с вами.\nДобро пожаловать в бот с азкарами 🌿\n\nЗдесь вы найдёте утренние и вечерние азкары, дуа перед сном, азкары после намаза, а также полезные напоминания и электронный тасбих.\n\nБот будет автоматически отправлять сообщения.", { parse_mode: "HTML", reply_markup: keyboards_1.startKeyboard });
    const { callbackQuery } = yield conversation.waitFor("callback_query");
    if (callbackQuery.data === "next:location") {
        yield ctx.api.answerCallbackQuery(callbackQuery.id, {
            text: "⚙️ Настройка бота",
        });
        yield ctx.api.deleteMessage(ctx_message.chat.id, ctx_message.message_id);
        yield (0, exports.locationConversation)(conversation, ctx);
    }
});
exports.startConversation = startConversation;
const locationConversation = (conversation, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield ctx.reply("<b>⚙️ Настройка бота:</b>\n\n🏝 Чтобы мы могли отправлять вам утренние и вечерние азкары, отправьте геолокацию для настройки местного времени намаза.", { parse_mode: "HTML", reply_markup: keyboards_1.locationKeyboard });
    const { message } = yield conversation.waitFor(":location");
    yield ctx.reply("📍", { reply_markup: { remove_keyboard: true } });
    if (!(message === null || message === void 0 ? void 0 : message.location)) {
        yield ctx.reply("<b>❌ Не удалось получить геолокацию</b>\n\nПопробуйте снова через команду /start.", { parse_mode: "HTML" });
        return;
    }
    const { latitude, longitude } = message.location;
    try {
        const prayTime = yield (0, requests_1.getPrayTime)(latitude.toString(), longitude.toString());
        const dateStr = prayTime.date.readable;
        const timingsUTC = {
            Fajr: (0, dayjs_1.default)(`${dateStr} ${prayTime.timings.Fajr}`, "D MMM YYYY HH:mm")
                .utc()
                .format("HH:mm"),
            Maghrib: (0, dayjs_1.default)(`${dateStr} ${prayTime.timings.Maghrib}`, "D MMM YYYY HH:mm")
                .utc()
                .format("HH:mm"),
        };
        yield User_1.default.updateOne({ telegramId: (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id }, {
            $set: {
                location: {
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                },
                date: prayTime.date,
                timings: timingsUTC,
                localTimings: prayTime.timings,
            },
        }, { upsert: true });
        yield ctx.reply(`<b>🌞 Ваше местное время намаза на ${prayTime.date.readable}</b>\n🌅 Фаджр — ${prayTime.timings.Fajr}\n🌃 Магриб — ${prayTime.timings.Maghrib}\n\n✅ Ваш аккаунт настроен, уведомления будут приходить автоматически.`, { parse_mode: "HTML", reply_markup: keyboards_1.toMenuKeyboard });
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
exports.locationConversation = locationConversation;
