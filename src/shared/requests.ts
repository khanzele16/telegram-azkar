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
  longitude: string
): Promise<IPrayTime | null> => {
  try {
    const { data } = await axios.get<IPrayTimeResponse>(
      `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`,
      { timeout: 5000 }
    );

    return {
      meta: { timezone: data.data.meta.timezone },
      date: {
        readable: data.data.date.readable,
        timestamp: Number(data.data.date.timestamp),
      },
      timings: {
        Fajr: data.data.timings.Fajr,
        Maghrib: data.data.timings.Maghrib,
      },
    };
  } catch (err: any) {
    console.error("⚠️ Ошибка получения времени молитв:", err.code || err.message);
    return null;
  }
};