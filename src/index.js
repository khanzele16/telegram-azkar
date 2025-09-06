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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const conversations_1 = require("@grammyjs/conversations");
const grammy_1 = require("grammy");
const message_1 = require("./handlers/message");
const callbackHandler_1 = require("./handlers/callbackHandler");
const config_1 = require("./config");
const conversations_2 = require("./handlers/conversations");
const hydrate_1 = require("@grammyjs/hydrate");
const menu_1 = require("./handlers/menu");
const prayerTimesCron_1 = require("./cron/prayerTimesCron");
dotenv_1.default.config({ path: "src/.env", override: true });
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ База данных подключена успешно"))
    .catch((err) => {
    console.error("❌ Ошибка подключения к базе данных:", err);
    process.exit(1);
});
bot.api.setMyCommands(config_1.commands);
bot.use((0, conversations_1.conversations)());
bot.use(menu_1.menuButtons);
config_1.commands.forEach((command) => {
    bot.command(command.command, (ctx, next) => __awaiter(void 0, void 0, void 0, function* () {
        yield ctx.conversation.exitAll();
        return next();
    }));
});
bot.use((0, conversations_1.createConversation)(conversations_2.startConversation, { plugins: [(0, hydrate_1.hydrate)()] }));
bot.use((0, conversations_1.createConversation)(conversations_2.locationConversation, { plugins: [(0, hydrate_1.hydrate)()] }));
config_1.commands.forEach((command) => {
    bot.command(command.command, command.action);
});
bot.on("callback_query", callbackHandler_1.handleCallbackQuery);
bot.on("message", message_1.messageHandler);
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`❌ Ошибка при обработке обновления ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof grammy_1.GrammyError) {
        console.error("❌ Ошибка в Telegram API:", e.description);
    }
    else if (e instanceof grammy_1.HttpError) {
        console.error("❌ Ошибка сети при обращении к Telegram:", e);
    }
    else {
        console.error("❌ Неизвестная ошибка:", e);
    }
});
(0, prayerTimesCron_1.startPrayerTimesCron)();
bot.start();
