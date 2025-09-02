import { model, Schema } from "mongoose";
import { IUser } from "../../types/models";

const User = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    location: {
      latitude: { type: String },
      longitude: { type: String },
    },
    date: {
      readable: { type: String },
      timestamp: { type: Number },
    },
    timings: {
      Fajr: { type: String },
      Maghrib: { type: String },
      fajrUTC: { type: String },
      maghribUTC: { type: String },
    },
    currentStreak: {
      value: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
    lastReadAt: { type: Date },
    preferences: {
      notifyMorning: { type: Boolean, default: true },
      notifyEvening: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default model<IUser>("User", User);
