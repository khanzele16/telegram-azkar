import { help, location, menu, profile, start } from "../handlers/commands";
import { statsHandler } from "../handlers/statsHandler";
import { type ICommand } from "../types";

export const commands: ICommand[] = [
  { command: "start", description: "Запустить бота", action: start },
  { command: "menu", description: "Открыть меню", action: menu },
  { command: "stats", description: "Статистика", action: statsHandler },
  { command: "location", description: "Установить геолокацию", action: location },
  { command: "profile", description: "Мой профиль", action: profile },
  { command: "help", description: "Помощь", action: help },
];
