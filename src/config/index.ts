import { help, location, menu, profile, start } from "../handlers/commands";
import { stats } from "../handlers/commands";
import { type ICommand } from "../types";

export const commands: ICommand[] = [
  {
    command: "start",
    description: "Запустить бота",
    action: start,
  },
  { command: "menu", description: "Открыть меню", action: menu },
  { command: "stats", description: "Статистика", action: stats },
  {
    command: "location",
    description: "Установить геолокацию",
    action: location,
  },
  {
    command: "profile",
    description: "Мой профиль",
    action: profile,
  },
  { command: "help", description: "Помощь", action: help },
];

export const STATUS = {
  PENDING: "pending",
  READ: "read",
  SKIPPED: "skipped",
} as const;

export const TYPE = {
  MORNING: "morning",
  EVENING: "evening",
} as const;

export function prayerToType(prayer: "Fajr" | "Asr"): "morning" | "evening" {
  return prayer === "Fajr" ? TYPE.MORNING : TYPE.EVENING;
}