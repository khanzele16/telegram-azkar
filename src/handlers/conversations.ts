import User from "../database/models/User";
import Day from "../database/models/Day";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";
import {
  locationKeyboard,
  MailingKeyboard,
  startKeyboard,
  toAdminKeyboard,
} from "../shared/keyboards";
import { getPrayTime } from "../shared/requests";
import { IPrayTime, MyConversation, MyConversationContext } from "../types";
import { updatePrayerTimesAndSchedule } from "../cron/prayerTimesCron";
import { menu } from "./commands";
import { menuButtons } from "./menu";

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
    const month = dayjs().month() + 1; // текущий месяц (1-12)
    const prayTimes: IPrayTime[] | null = await getPrayTime(
      latitude.toString(),
      longitude.toString(),
      month
    );

    if (!prayTimes || prayTimes.length === 0) {
      await ctx.reply(
        "❌ Ошибка при получении времени намаза. Попробуйте снова."
      );
      return;
    }

    // Формируем массив timings
    const timingsToAdd = prayTimes.map((pt) => {
      const fajrUTC = dayjs(`${pt.date} ${pt.Fajr}`, "DD-MM-YYYY HH:mm")
        .utc()
        .toISOString();
      const maghribUTC = dayjs(`${pt.date} ${pt.Maghrib}`, "DD-MM-YYYY HH:mm")
        .utc()
        .toISOString();

      return {
        date: pt.date,
        FajrUTC: fajrUTC,
        MaghribUTC: maghribUTC,
      };
    });

    // Сохраняем в User (обновляем полностью массив timings)
    const user = await User.findOneAndUpdate(
      { telegramId: ctx.from?.id },
      {
        $set: {
          "location.latitude": latitude.toString(),
          "location.longitude": longitude.toString(),
          timings: timingsToAdd,
        },
      },
      { upsert: true, new: true }
    );

    // Создаем Day документы (если их еще нет)
    for (const timing of timingsToAdd) {
      const existingDay = await Day.findOne({
        userId: user!._id,
        date: timing.date,
      });

      if (!existingDay) {
        await Day.create([
          {
            userId: user!._id,
            date: timing.date,
            type: "morning",
            utcTime: timing.FajrUTC,
            status: "pending",
          },
          {
            userId: user!._id,
            date: timing.date,
            type: "evening",
            utcTime: timing.MaghribUTC,
            status: "pending",
          },
        ]);
      }
    }

    // Берем сегодняшнее время намаза
    const today = dayjs().format("DD-MM-YYYY");
    const todayPrayTime =
      prayTimes.find((p) => p.date === today) || prayTimes[0];

    await ctx.reply(
      `<b>🌞 Ваши напоминания на месяц настроены</b>\n\n` +
        `<b>Сегодня (${dayjs().format("D MMMM YYYY")})</b>:\n` +
        `🌅 Фаджр — ${todayPrayTime.Fajr}\n` +
        `🌃 Магриб — ${todayPrayTime.Maghrib}\n\n` +
        "✅ Уведомления будут приходить автоматически.\n" +
        "🏠 Можете перейти в <b>главное меню</b> с помощью /menu.",
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Ошибка в locationConversation:", err);
    await ctx.reply(
      "❌ Ошибка при получении времени намаза. Попробуйте снова."
    );
  }
};

export async function broadcastConversation(
  conversation: MyConversation,
  ctx: MyConversationContext
) {
  await ctx.reply("✏️ Введите текст для рассылки:");
  const { message } = await conversation.waitFor(":text");
  const text = message?.text;
  if (!text) {
    await ctx.reply("❌ Нужно ввести текст");
    return await broadcastConversation(conversation, ctx);
  }

  await ctx.reply("🖼 Пришлите изображение (или напишите 'нет'):");
  const { message: imageMessage } = await conversation.waitFor("message");

  let photo: string | null = null;
  if (imageMessage?.photo) {
    photo = imageMessage.photo[imageMessage.photo.length - 1].file_id;
  }
  try {
    if (photo) {
      await ctx.replyWithPhoto(photo, {
        caption: `<b>📢 Предпросмотр сообщения рассылки:</b>\n\n${text}\n\nНачать рассылку?`,
        parse_mode: "HTML",
        reply_markup: MailingKeyboard,
      });
    } else {
      await ctx.reply(
        `<b>📢 Предпросмотр сообщения рассылки:</b>\n\n${text}\n\nНачать рассылку?`,
        { reply_markup: MailingKeyboard, parse_mode: "HTML" }
      );
    }
  } catch (err) {
    await ctx.reply("❌ Ошибка при обработке сообщения для рассылки");
    console.log("Ошибка при обработке сообщения для рассылки: ", err);
  }

  const { callbackQuery } = await conversation.waitFor("callback_query");

  if (callbackQuery?.data === "mailing:cancel") {
    await ctx.api.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Рассылка отменена.",
    });
    await ctx.reply("❌ Рассылка отменена.");
    return;
  } else if (callbackQuery?.data === "mailing:yes") {
    await ctx.api.answerCallbackQuery(callbackQuery.id, {
      text: "📤 Начинаем рассылку...",
    });
    await ctx.reply("📤 Начинаем рассылку...");
  }

  const users = await User.find({
    blocked: false,
  });

  let success = 0;
  for (const user of users) {
    try {
      if (photo) {
        await ctx.api.sendPhoto(user.telegramId, photo, {
          parse_mode: "HTML",
          caption: text,
        });
      } else {
        await ctx.api.sendMessage(user.telegramId, text, {
          parse_mode: "HTML",
        });
      }
      success++;
    } catch (err) {
      console.error(`Ошибка рассылки ${user.telegramId}:`, err);
    }
  }

  await ctx.reply(`✅ Рассылка завершена. Успешно отправлено: ${success}`);
}
