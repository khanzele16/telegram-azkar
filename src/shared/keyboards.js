"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMenuKeyboard = exports.startKeyboard = exports.locationKeyboard = void 0;
const grammy_1 = require("grammy");
exports.locationKeyboard = new grammy_1.Keyboard().requestLocation("📍 Отправить геолокацию").resized().placeholder('Нажмите на кнопку ↓');
exports.startKeyboard = new grammy_1.InlineKeyboard().text("Продолжить ▶️", "next:location");
exports.toMenuKeyboard = new grammy_1.InlineKeyboard().text("🏠 К главному меню", "menu");
