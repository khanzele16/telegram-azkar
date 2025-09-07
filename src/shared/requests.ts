import axios from "axios";
import { IPrayTime } from "../types";

export const getPrayTime = async (latitude: string, longitude: string) => {
  try {
    const { data } = await axios.get(
      `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
    );
    const prayUserTime: IPrayTime = {
      meta: { timezone: data.data.meta.timezone },
      date: {
        readable: data.data.date.readable,
        timestamp: data.data.date.timestamp,
      },
      timings: {
        Fajr: data.data.timings.Fajr,
        Maghrib: "20:50",
      },
    };
    return prayUserTime;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
