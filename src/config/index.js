"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const commands_1 = require("../handlers/commands");
const statsHandler_1 = require("../handlers/statsHandler");
exports.commands = [
    { command: "start", description: "Запустить бота", action: commands_1.start },
    { command: "menu", description: "Открыть меню", action: commands_1.menu },
    { command: "stats", description: "Статистика", action: statsHandler_1.statsHandler },
    { command: "location", description: "Установить геолокацию", action: commands_1.location },
    { command: "profile", description: "Мой профиль", action: commands_1.profile },
    { command: "help", description: "Помощь", action: commands_1.help },
];
