import dotenv from "dotenv";
import Day from "../database/models/Day";
import User from "../database/models/User";
import Azkar from "../database/models/Azkar";
import timezone from "dayjs/plugin/timezone";
import { Api, InlineKeyboard } from "grammy";
import { StreakService } from "../services/StreakService";
import {
  cancelAzkarNotification,
  scheduleAzkarNotify,
} from "../cron/prayerTimesCron";
import { Types } from "mongoose";
import { MyContext } from "../types";
import { IAzkar } from "../types/models";
import dayjs from "dayjs";

dotenv.config({ path: "src/.env" });

dayjs.extend(timezone);

const api = new Api(process.env.BOT_TOKEN as string);

const STATUS = {
  PENDING: "pending",
  READ: "read",
  SKIPPED: "skipped",
} as const;

const TYPE = {
  MORNING: "morning",
  EVENING: "evening",
} as const;

function prayerToType(prayer: "Fajr" | "Maghrib"): "morning" | "evening" {
  return prayer === "Fajr" ? TYPE.MORNING : TYPE.EVENING;
}

const sliderStates = new Map<
  string,
  {
    index: number;
    date: string;
    userId: Types.ObjectId;
    chatId: number;
    type: "morning" | "evening";
    azkar: IAzkar[];
  }
>();

export async function sendAzkarNotify(
  telegramId: number,
  prayer: "Fajr" | "Maghrib",
  date: string,
  chatId?: number
): Promise<void> {
  const targetChatId = chatId ?? telegramId;
  const user = await User.findOne({ telegramId });

  if (!user) return;
  const type = prayerToType(prayer);
  const existingDay = await Day.findOne({ userId: user._id, date, type });
  if (
    existingDay &&
    (existingDay.status === "read" ||
      existingDay.status === "skipped")
  ) {
    console.log(`Пропускаем напоминание для пользователя ${telegramId}, статус: ${existingDay.status}`);
    return;
  }
  await api.sendMessage(
    targetChatId,
    `🕌 Время ${
      prayer === "Fajr" ? "утренних" : "вечерних"
    } азкаров уже давно настало.\n\n<b>⚠️ Отметьтесь, пока не стало поздно!</b>`,
    { parse_mode: "HTML" }
  );
}

export async function sendAzkarNotification(
  telegramId: number,
  prayer: "Fajr" | "Maghrib",
  date: string,
  chatId?: number
): Promise<void> {
  const targetChatId = chatId ?? telegramId;
  const user = await User.findOne({ telegramId });
  if (!user) return;
  const type = prayerToType(prayer);
  const existingDay = await Day.findOne({ userId: user._id, date, type });
  if (
    existingDay &&
    (existingDay.status === STATUS.READ ||
      existingDay.status === STATUS.SKIPPED)
  ) {
    return;
  }
  const keyboard = new InlineKeyboard()
    .text("📖 Прочитать", `azkarnotify:read:${prayer}:${date}`)
    .text("❌ Сегодня не буду", `azkarnotify:skip:${prayer}:${date}`);
  const ctx_message = await api.sendMessage(
    targetChatId,
    `🕌 Время ${prayer === "Fajr" ? "утренних" : "вечерних"} азкаров.`,
    { reply_markup: keyboard }
  );
  await Day.updateOne(
    { userId: user._id, date, type },
    {
      $set: { messageId: ctx_message.message_id },
      $setOnInsert: { status: STATUS.PENDING, startedAt: new Date() },
      $inc: { remindersSent: 1 },
    },
    { upsert: true }
  );
  // Планируем напоминание через минуту только если это первое уведомление
  // и напоминание еще не было запланировано
  const updatedDay = await Day.findOne({ userId: user._id, date, type });
  if (
    updatedDay &&
    updatedDay.status === STATUS.PENDING &&
    updatedDay.remindersSent === 1 &&
    !updatedDay.reminderScheduled
  ) {
    const nextRunAtISO = dayjs().add(1, "minutes").utc().toISOString();
    console.log("Планируем напоминание через минуту:", nextRunAtISO);
    
    // Отмечаем, что напоминание запланировано
    await Day.updateOne(
      { userId: user._id, date, type },
      { $set: { reminderScheduled: true } }
    );
    
    await scheduleAzkarNotify(
      user._id.toString(),
      telegramId,
      prayer,
      date,
      nextRunAtISO
    );
  }
}

async function startAzkarSlider(
  ctx: MyContext,
  userId: Types.ObjectId,
  chatId: number,
  prayer: "Fajr" | "Maghrib",
  date: string
) {
  const type = prayerToType(prayer);
  const azkar = await Azkar.find({ category: type }).lean();
  if (azkar.length === 0) {
    await ctx.api.sendMessage(chatId, "Нет азкаров для отображения");
    return;
  }

  if (!ctx.from) {
    await ctx.api.sendMessage(chatId, "❌ Ошибка контекста");
    return;
  }

  const sliderId = `${ctx.from.id}:${Date.now()}`;
  sliderStates.set(sliderId, { index: 0, date, userId, chatId, type, azkar });

  const keyboard = buildSliderKeyboard(sliderId, 0, azkar.length);
  await ctx.api.sendMessage(
    chatId,
    formatAzkarMessage(azkar[0], 1, azkar.length),
    { reply_markup: keyboard, parse_mode: "HTML" }
  );
}

function buildSliderKeyboard(
  sliderId: string,
  index: number,
  total: number
): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏪", `slider:${sliderId}:prev`)
    .text(`${index + 1}/${total}`, `slider:${sliderId}:info`)
    .text("⏩", `slider:${sliderId}:next`)
    .row()
    .text("✅ Завершить", `slider:${sliderId}:finish`);
}

function formatAzkarMessage(azkar: IAzkar, i: number, total: number): string {
  return `<b>📖 Азкар ${i}/${total}</b>\n\n<blockquote>${azkar.text}\n\n${azkar.translation}</blockquote>\n\n<b>Транскрипция:</b> ${azkar.transcription}`;
}

export async function handleAzkarNotifyCallback(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery("❌ Некорректные данные");
    return;
  }

  const [, action, prayer, date] = data.split(":");
  if (!ctx.from) return;
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.answerCallbackQuery("❌ Пользователь не найден");
    return;
  }

  const typeLabel = prayer === "Fajr" ? "утренних" : "вечерних";
  const dbType = prayerToType(prayer as "Fajr" | "Maghrib");
  const dayRecord = await Day.findOne({ userId: user._id, date, type: dbType });


  if (action === "skip") {
    await cancelAzkarNotification(
      user._id.toString(),
      prayer as "Fajr" | "Maghrib",
      date
    );
    await StreakService.markSkipped(user._id, date, dbType);
    if (dayRecord?.messageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          dayRecord.messageId,
          `❌ Вы сегодня пропустили чтение ${typeLabel} азкаров`
        );
      } catch {}
    }
    await ctx.answerCallbackQuery("День отмечен как пропущенный");
    return;
  }

  if (action === "read") {
    await Day.updateOne(
      { userId: user._id, date, type: dbType },
      { $set: { status: STATUS.PENDING, startedAt: new Date() } },
      { upsert: true }
    );
    if (dayRecord?.messageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          dayRecord.messageId,
          `📖 Чтение ${typeLabel} азкаров`
        );
      } catch {}
    }
    await startAzkarSlider(
      ctx,
      user._id,
      ctx.from.id,
      prayer as "Fajr" | "Maghrib",
      date
    );
    await ctx.answerCallbackQuery();
    return;
  }

  await ctx.answerCallbackQuery("❌ Неизвестное действие");
}

export async function handleSliderCallback(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery("❌ Некорректные данные");
    return;
  }

  const parts = data.split(":");
  const action = parts.pop();
  const sliderId = parts.slice(1).join(":");
  const state = sliderStates.get(sliderId);

  if (!state) {
    await ctx.answerCallbackQuery("Слайдер устарел");
    return;
  }

  const total = state.azkar.length;

  if (action === "prev") {
    state.index = Math.max(0, state.index - 1);
    await ctx.answerCallbackQuery("👈 Предыдущий");
  } else if (action === "next") {
    state.index = Math.min(total - 1, state.index + 1);
    await ctx.answerCallbackQuery("👉 Следующий");
  } else if (action === "finish") {
    sliderStates.delete(sliderId);
    try {
      await Day.updateOne(
        { userId: state.userId, date: state.date, type: state.type },
        { $set: { status: STATUS.READ, finishedAt: new Date() } }
      );
      await ctx.editMessageText("🎉 Вы прочитали сегодня азкары, поздравляем!");
    } catch {
      await ctx.answerCallbackQuery("Слайдер устарел");
      return;
    }
    await ctx.answerCallbackQuery("🎉 Завершено");
    return;
  }

  const currentAzkar = state.azkar[state.index];
  if (!currentAzkar) {
    await ctx.answerCallbackQuery("❌ Ошибка загрузки");
    return;
  }

  const kb = buildSliderKeyboard(sliderId, state.index, total);
  const messageText = formatAzkarMessage(currentAzkar, state.index + 1, total);

  try {
    await ctx.editMessageText(messageText, {
      reply_markup: kb,
      parse_mode: "HTML",
    });
  } catch {
    await ctx.answerCallbackQuery("❌ Ошибка обновления сообщения");
  }
}
