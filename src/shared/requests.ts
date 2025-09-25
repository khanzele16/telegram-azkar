import dayjs from "dayjs";
import axios from "axios";
import axiosRetry from "axios-retry";
import { IPrayTime, IPrayTimeResponse } from "../types";

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
  month: number
): Promise<IPrayTime[] | null> => {
  try {
    const { data } = await axios.get<IPrayTimeResponse>(
      `https://api.aladhan.com/v1/calendar?month=${month}&latitude=${latitude}&longitude=${longitude}&method=2`
    );
    const today = dayjs();
    return data.data
      .map((item) => {
        return {
          timezone: item.meta.timezone,
          date: item.date.gregorian.date,
          Fajr: "11:20",
          Maghrib: item.timings.Maghrib.replace(/\s*\(.*?\)\s*/g, ""),
        };
      })
      .filter((item) => {
        const [day, month, year] = item.date.split("-");
        const itemDay = dayjs(`${year}-${month}-${day}`);
        return itemDay.isSame(today, "day") || itemDay.isAfter(today, "day");
      });
  } catch (err) {
    console.error("⚠️ Ошибка получения времени молитв:", err);
    throw err;
  }
};
