import { Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  telegramId: number;
  username?: string;
  location?: {
    latitude: string;
    longitude: string;
  };
  timings?: {
    date: string;
    FajrUTC: string;
    MaghribUTC: string;
  }[];
  date?: {
    readable: string;
    timestamp: number;
  };
  currentStreak: {
    value: number;
    lastUpdated: Date;
  };
  blocked: boolean;
  lastReadAt?: Date;
  preferences: {
    notifyMorning: boolean;
    notifyEvening: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserData {
  telegramId: number;
  username?: string;
  location?: {
    latitude: string;
    longitude: string;
  };
  date?: {
    readable: string;
    timestamp: number;
  };
  timings?: {
    Fajr: string;
    Maghrib: string;
  };
}

export interface IAzkar {
  _id: Types.ObjectId;
  text: string;
  category: string;
  translation?: string;
  transcription?: string;
  audio?: string;
}

export interface IDay {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  type: "morning" | "evening";
  status: "pending" | "read" | "skipped" | "postponed";
  utcTime: string;
  startedAt?: Date;
  finishedAt?: Date;
  postponedUntil?: Date;
  messageId: number;
  createdAt?: Date;
  updatedAt?: Date;
}
