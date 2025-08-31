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
  text?: string;
  audio?: string;
  category?: string;
  translation?: string;
  transcription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
