import { InlineKeyboard, Keyboard } from "grammy";

export const locationKeyboard = new Keyboard()
  .requestLocation("📍 Отправить геолокацию")
  .resized()
  .placeholder("Нажмите на кнопку ↓");

export const startKeyboard = new InlineKeyboard().text(
  "Продолжить ▶️",
  "next:location"
);

export const toAdminKeyboard = new InlineKeyboard().text(
  "🔙 Вернуться",
  "admin"
);

export const MailingKeyboard = new InlineKeyboard().text('✅ Да', 'mailing:yes').text('❌ Нет', 'mailing:cancel');

export const openAzkar = new InlineKeyboard().text('Открыть азкары', 'open:azkar');