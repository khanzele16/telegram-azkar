import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import axiosRetry from "axios-retry";
import { IPrayTime, IPrayTimeResponse } from "../types";

dayjs.extend(utc);
dayjs.extend(timezone);

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      console.log(error),
      axiosRetry.isNetworkError(error) ||
        axiosRetry.isRetryableError(error) ||
        (error.response?.status ?? 500) >= 500
    );
  },
});

export const getPrayTime = async (
  latitude: string,
  longitude: string,
  month: number,
  secondMonth?: number
): Promise<IPrayTime[] | null> => {
  try {
    const today = dayjs();
    const months = [month];
    if (secondMonth) months.push(secondMonth);
    const allResults: IPrayTime[] = [];
    for (const m of months) {
      const { data } = await axios.get<IPrayTimeResponse>(
        `https://api.aladhan.com/v1/calendar?month=${m}&latitude=${latitude}&longitude=${longitude}&method=2`
      );
      const mapped = data.data
        .map((item) => {
          return {
            timezone: item.meta.timezone,
            date: item.date.gregorian.date,
            Fajr: item.timings.Fajr.replace(/\s*\(.*?\)\s*/g, ""),
            Asr: item.timings.Asr.replace(/\s*\(.*?\)\s*/g, ""),
          };
        })
        .filter((item) => {
          const [day, month, year] = item.date.split("-");
          const itemDay = dayjs(`${year}-${month}-${day}`);
          return itemDay.isSame(today, "day") || itemDay.isAfter(today, "day");
        });
      allResults.push(...mapped);
    }
    return allResults;
  } catch (err) {
    console.error("⚠️ Ошибка получения времени молитв:", err);
    throw err;
  }
};
