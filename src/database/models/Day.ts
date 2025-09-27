import { model, Schema, Types } from "mongoose";
import { IDay } from "../../types/models";

const Day = new Schema<IDay>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    remindersSent: { type: Number, default: 0 },
    type: { type: String, enum: ["morning", "evening"], required: true },
    status: {
      type: String,
      enum: ["pending", "read", "skipped"],
      default: "pending",
    },
    utcTime: { type: String, required: true },
    messageId: Number,
    startedAt: Date,
    finishedAt: Date,
    timezone: { type: String, required: true },
  },
  { timestamps: true }
);

Day.index({ userId: 1, date: 1, type: 1 }, { unique: true });

export default model<IDay>("Day", Day);
