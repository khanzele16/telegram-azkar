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
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuButtons = void 0;
const menu_1 = require("@grammyjs/menu");
const commands_1 = require("./commands");
exports.menuButtons = new menu_1.Menu("menu")
    .text("👤 Мой профиль", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.answerCallbackQuery("👤 Мой профиль");
    ctx.menu.close();
    yield (0, commands_1.profile)(ctx);
}))
    .row()
    .text("📍 Геолокация", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.answerCallbackQuery("📍 Геолокация");
    ctx.menu.close();
    yield (0, commands_1.location)(ctx);
}))
    .text("🗓 Статистика", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.answerCallbackQuery("🗓 Статистика");
    ctx.menu.close();
    yield (0, commands_1.stats)(ctx);
}))
    .row()
    .text("❓ Помощь", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.answerCallbackQuery("❓ Помощь");
    ctx.menu.close();
    yield ctx.reply("<b>❓ Помощь</b>\n\nЕсли возникли какие-то трудности, то пишите @khanzele", { parse_mode: "HTML" });
}));
