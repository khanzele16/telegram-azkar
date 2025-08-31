import { Menu } from "@grammyjs/menu";
import { MyContext } from "../types";
import { profileHandler } from ".";
import { help } from "./commands";

export const menuButtons = new Menu<MyContext>("menu")
  .text("👤 Мой профиль", async (ctx) => {
    await ctx.answerCallbackQuery("👤 Мой профиль");
    ctx.menu.close();
    await profileHandler(ctx);
  })
  .row()
  .text("📍 Геолокация", async (ctx) => {
    await ctx.answerCallbackQuery("📍 Геолокация");
    ctx.menu.close();
    await ctx.conversation.enter("locationConversation");
  })
  .text("🗓 Статистика", async (ctx) => {
    await ctx.answerCallbackQuery("🗓 Статистика");
    ctx.menu.close();
    await ctx.reply("Статистика пока в разработке");
  })
  .row()
  .text("❓ Помощь", async (ctx) => {
    await ctx.answerCallbackQuery("❓ Помощь");
    ctx.menu.close();
    await help(ctx, true);
  });
