import { Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
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
    fajrUTC: { type: String };
    maghribUTC: { type: String };
  };
  currentStreak: {
    value: number;
    lastUpdated: Date;
  };
  preferences: {
    notifyMorning: Boolean;
    notifyEvening: Boolean;
  };
  lastReadAt?: Date;
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
  azkarsId: Types.ObjectId[];
  date: string;
  status: "read" | "skipped" | "postponed" | "pending";
  type: "morning" | "evening";
  createdAt?: Date;
  updatedAt?: Date;
}
