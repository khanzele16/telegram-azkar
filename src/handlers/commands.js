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
exports.help = exports.profile = exports.location = exports.stats = exports.menu = exports.start = void 0;
const User_1 = __importDefault(require("../database/models/User"));
const auth_1 = require("../database/controllers/auth");
const menu_1 = require("./menu");
const index_1 = require("./index");
const statsHandler_1 = require("./statsHandler");
const start = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id)) {
            yield ctx.reply("Ошибка: не удалось определить пользователя");
            return;
        }
        const isRegistered = yield (0, auth_1.register)(ctx);
        if (isRegistered) {
            yield (0, exports.menu)(ctx);
        }
        else {
            yield ctx.conversation.enter("startConversation");
        }
    }
    catch (error) {
        console.error("Error in start command:", error);
        yield ctx.reply("Произошла ошибка при запуске бота. Попробуйте позже.");
    }
});
exports.start = start;
const menu = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id)) {
            yield ctx.reply("Ошибка: не удалось определить пользователя");
            return;
        }
        const user = yield User_1.default.findOne({ telegramId: ctx.from.id });
        if (!user) {
            yield ctx.reply("Вы не зарегистрированы. Используйте /start для регистрации.");
            return;
        }
        if (!((_b = user.location) === null || _b === void 0 ? void 0 : _b.latitude) || !((_c = user.location) === null || _c === void 0 ? void 0 : _c.longitude)) {
            yield ctx.reply("Вы не установили местоположение");
            yield ctx.conversation.enter("locationConversation");
            return;
        }
        yield ctx.reply("📌 Главное меню\n\nВыберите действие:", {
            reply_markup: menu_1.menuButtons,
        });
    }
    catch (error) {
        console.error("Error in menu command:", error);
        yield ctx.reply("Произошла ошибка при открытии меню. Попробуйте позже.");
    }
});
exports.menu = menu;
const stats = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, statsHandler_1.statsHandler)(ctx);
    }
    catch (error) {
        console.error("Error in stats command:", error);
        yield ctx.reply("Произошла ошибка при загрузке статистики. Попробуйте позже.");
    }
});
exports.stats = stats;
const location = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield ctx.conversation.enter("locationConversation");
    }
    catch (error) {
        console.error("Error in location command:", error);
        yield ctx.reply("Произошла ошибка при установке геолокации. Попробуйте позже.");
    }
});
exports.location = location;
const profile = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, index_1.profileHandler)(ctx);
    }
    catch (error) {
        console.error("Error in profile command:", error);
        yield ctx.reply("Произошла ошибка при загрузке профиля. Попробуйте позже.");
    }
});
exports.profile = profile;
const help = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield ctx.reply("<b>Помощь</b>\n\nЕсли возникли какие-то трудности, то пишите @khanzele", { parse_mode: "HTML" });
    }
    catch (error) {
        console.error("Error in help command:", error);
        yield ctx.reply("Произошла ошибка при отображении справки.");
    }
});
exports.help = help;
