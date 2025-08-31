import { help, menu, start } from "../handlers/commands";
import { type ICommand } from "../types";

export const commands: ICommand[] = [
  { command: "start", description: "Запустить бота", action: start },
  { command: "menu", description: "Открыть меню", action: menu },
  { command: "help", description: "Помощь", action: help },
];
