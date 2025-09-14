import User from "../database/models/User";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import {
  locationKeyboard,
  startKeyboard,
  toMenuKeyboard,
} from "../shared/keyboards";
import { getPrayTime } from "../shared/requests";
import { IPrayTime, MyConversation, MyConversationContext } from "../types";
import { updatePrayerTimesAndSchedule } from "../cron/prayerTimesCron";
import { menu } from "./commands";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("ru");

export const startConversation = async (
  conversation: MyConversation,
  ctx: MyConversationContext
): Promise<void> => {
  const ctx_message = await ctx.reply(
    "<b>Ассаляму Алейкум ва Рахматуллахи ва Баракатуh!</b>\n\n" +
      "Мир, милость и благословение Аллаха да будут с вами.\n" +
      "Добро пожаловать в бот с азкарами 🌿\n\n" +
      "Здесь вы найдёте утренние и вечерние азкары, дуа перед сном, азкары после намаза, " +
      "а также полезные напоминания и электронный тасбих.\n\n" +
      "Бот будет автоматически отправлять сообщения.",
    { parse_mode: "HTML", reply_markup: startKeyboard }
  );

  const { callbackQuery } = await conversation.waitFor("callback_query");
  if (callbackQuery.data === "next:location") {
    await ctx.api.answerCallbackQuery(callbackQuery.id, {
      text: "⚙️ Настройка бота",
    });
    await ctx.api.deleteMessage(ctx_message.chat.id, ctx_message.message_id);
    await locationConversation(conversation, ctx);
  }
};

export const locationConversation = async (
  conversation: MyConversation,
  ctx: MyConversationContext
): Promise<void> => {
  await ctx.reply(
    "<b>⚙️ Настройка бота:</b>\n\n" +
      "🏝 Чтобы мы могли отправлять вам утренние и вечерние азкары, " +
      "отправьте геолокацию для настройки местного времени намаза.",
    { parse_mode: "HTML", reply_markup: locationKeyboard }
  );

  const { message } = await conversation.waitFor(":location");
  await ctx.reply("📍", { reply_markup: { remove_keyboard: true } });

  if (!message?.location) {
    await ctx.reply(
      "<b>❌ Не удалось получить геолокацию</b>\n\nПопробуйте снова через команду /start.",
      { parse_mode: "HTML" }
    );
    return;
  }

  const { latitude, longitude } = message.location;

  try {
    const prayTime: IPrayTime | null = await getPrayTime(
      latitude.toString(),
      longitude.toString()
    );

    if (!prayTime) {
      await ctx.reply(
        "❌ Ошибка при получении времени намаза. Попробуйте снова."
      );
      return;
    }

    const fajrLocal = dayjs
      .unix(prayTime.date.timestamp)
      .tz(prayTime.meta.timezone)
      .hour(Number(prayTime.timings.Fajr.split(":")[0]))
      .minute(Number(prayTime.timings.Fajr.split(":")[1]));

    const maghribLocal = dayjs
      .unix(prayTime.date.timestamp)
      .tz(prayTime.meta.timezone)
      .hour(Number(prayTime.timings.Maghrib.split(":")[0]))
      .minute(Number(prayTime.timings.Maghrib.split(":")[1]));

    const timingsUTC = {
      FajrUTC: fajrLocal.utc().toISOString(),
      MaghribUTC: maghribLocal.utc().toISOString(),
    };

    await User.findOneAndUpdate(
      { telegramId: ctx.from?.id },
      {
        $set: {
          "location.latitude": latitude.toString(),
          "location.longitude": longitude.toString(),
          "timings.FajrUTC": timingsUTC.FajrUTC,
          "timings.MaghribUTC": timingsUTC.MaghribUTC,
          date: prayTime.date,
          localTimings: prayTime.timings,
        },
      },
      { upsert: true, new: true }
    );

    await updatePrayerTimesAndSchedule();

    const ctx_message = await ctx.reply(
      `<b>🌞 Ваше местное время намаза на ${dayjs(
        prayTime.date.timestamp * 1000
      ).format("D MMMM YYYY")}</b>\n` +
        `🌅 Фаджр — ${prayTime.timings.Fajr}\n` +
        `🌃 Магриб — ${prayTime.timings.Maghrib}\n\n` +
        "✅ Ваш аккаунт настроен, уведомления будут приходить автоматически.",
      { parse_mode: "HTML", reply_markup: toMenuKeyboard }
    );

    const { callbackQuery, message } = await conversation.waitFor([
      "callback_query",
      "message",
    ]);

    if (callbackQuery) {
      if (callbackQuery.data === "menu") {
        await ctx.api.answerCallbackQuery(callbackQuery.id, {
          text: "📌 Главное меню",
        });
        await ctx.api.deleteMessage(ctx.chat!.id, ctx_message.message_id);
        conversation.menu("menu");
      }
    }
  } catch (err) {
    console.error("Ошибка в locationConversation:", err);
    await ctx.reply(
      "❌ Ошибка при получении времени намаза. Попробуйте снова."
    );
  }
};
