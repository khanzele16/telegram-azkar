import { InlineKeyboard, Keyboard } from "grammy";

export const locationKeyboard = new Keyboard().requestLocation("📍 Отправить геолокацию").resized().placeholder('Нажмите на кнопку ↓');

export const startKeyboard = new InlineKeyboard().text(
  "Продолжить ▶️",
  "next:location"
);

export const toMenuKeyboard = new InlineKeyboard().text("🏠 К главному меню", "menu");