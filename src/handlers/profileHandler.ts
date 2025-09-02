import { MyContext } from "../types";
import User from "../database/models/User";

export async function profileHandler(ctx: MyContext): Promise<void> {
  const user = await User.findOne({ telegramId: ctx.from!.id });
  if (!user) { await ctx.reply("Пользователь не найден"); return; }
  await ctx.reply(`ID: ${user.telegramId}`);
}