import { InlineKeyboard } from "grammy";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import { ICalendarDay } from "../services/CalendarService";
import "dayjs/locale/ru";

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale('ru')

export const generateCalendarMarkup = (
  calendar: ICalendarDay[],
  year: number,
  month: number
) => {
  const kb = new InlineKeyboard();

  const currentMonth = dayjs(`${year}-${month}-01`);
  const prevMonth = currentMonth.subtract(1, "month");
  const nextMonth = currentMonth.add(1, "month");

  kb.text("⬅️", `calendar:${prevMonth.year()}:${prevMonth.month() + 1}`);
  kb.text(currentMonth.format("MMMM YYYY"), "noop");
  kb.text("➡️", `calendar:${nextMonth.year()}:${nextMonth.month() + 1}`);
  kb.row();

  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach((d) =>
    kb.text(d, "empty")
  );
  kb.row();

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");

  const startWeekday = startOfMonth.isoWeekday();
  const daysInMonth = endOfMonth.date();

  let col = 0;

  for (let i = 1; i < startWeekday; i++) {
    kb.text(" ", "empty");
    col++;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = currentMonth.date(day).format("YYYY-MM-DD");
    const reading = calendar.find((r) => r.date === date);

    let emoji = "";
    if (reading?.status === "read") emoji = "✅";
    if (reading?.status === "skipped") emoji = "❌";
    if (reading?.status === "postponed") emoji = "⏸";

    kb.text(`${day} ${emoji}`, `day:${year}:${month}:${day}`);
    col++;

    if (col === 7) {
      kb.row();
      col = 0;
    }
  }

  if (col > 0) {
    for (; col < 7; col++) {
      kb.text(" ", "empty");
    }
    kb.row();
  }

  return kb;
};
