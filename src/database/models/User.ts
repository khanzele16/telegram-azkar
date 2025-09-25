import { model, Schema } from "mongoose";
import { IUser } from "../../types/models";

const User = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    location: {
      latitude: String,
      longitude: String,
    },
    timings: [
      {
        timezone: { type: String, required: true },
        date: { type: String, required: true },
        FajrUTC: { type: String, required: true },
        MaghribUTC: { type: String, required: true },
      },
    ],
    date: {
      readable: String,
      timestamp: Number,
    },
    currentStreak: {
      value: { type: Number, default: 0 },
      lastUpdated: Date,
    },
    lastReadAt: Date,
    blocked: {
      type: Boolean,
      default: false,
    },
    preferences: {
      notifyMorning: { type: Boolean, default: true },
      notifyEvening: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default model<IUser>("User", User);
