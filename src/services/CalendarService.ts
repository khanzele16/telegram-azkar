import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Types } from "mongoose";
import Day from "../database/models/Day";

dayjs.extend(isoWeek);

export type Status = "read" | "skipped" | "postponed" | "pending";

export interface ICalendarDay {
  date: string;
  morningStatus?: Status;
  eveningStatus?: Status;
}

export class CalendarService {
  static async getMonthCalendar(
    userId: Types.ObjectId,
    year: number,
    month: number
  ): Promise<ICalendarDay[]> {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = start.endOf("month");

    const days = await Day.find({
      userId,
      date: {
        $gte: start.format("YYYY-MM-DD"),
        $lte: end.format("YYYY-MM-DD"),
      },
    });

    const calendar: ICalendarDay[] = [];

    for (
      let d = start;
      d.isBefore(end) || d.isSame(end, "day");
      d = d.add(1, "day")
    ) {
      const dateStr = d.format("YYYY-MM-DD");
      const morning = days.find(
        (x) => x.date === dateStr && x.type === "morning"
      );
      const evening = days.find(
        (x) => x.date === dateStr && x.type === "evening"
      );

      calendar.push({
        date: dateStr,
        morningStatus: morning?.status || "pending",
        eveningStatus: evening?.status || "pending",
      });
    }

    return calendar;
  }
}
