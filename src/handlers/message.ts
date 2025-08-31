import { type MyContext } from "../types";

export async function messageHandler(ctx: MyContext) {
  await ctx.reply(
    "<b>❗️ Я не понял ваш запрос!</b>\n\nДля того, чтобы узнать какие команды я могу выполнять, воспользуйтесь <b>/help</b>",
    { parse_mode: "HTML" }
  );
}
