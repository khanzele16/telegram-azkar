import dayjs from "dayjs";
import axios from "axios";
import axiosRetry from "axios-retry";
import { IPrayTime, IPrayTimeResponse } from "../types";

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
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
          date: item.date.gregorian.date,
          Fajr: item.timings.Fajr.replace(/\s*\(.*?\)\s*/g, ""),
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
    return null;
  }
};
