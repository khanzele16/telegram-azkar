import { model, Schema, Types } from "mongoose";
import { IDay } from "../../types/models";

const Day = new Schema<IDay>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    type: { type: String, enum: ["morning", "evening"], required: true },
    status: {
      type: String,
      enum: ["pending", "read", "skipped", "postponed"],
      default: "pending",
    },
    azkarIds: [{ type: Schema.Types.ObjectId, ref: "Azkar" }], // какие азкары прочитал
    startedAt: Date,
    finishedAt: Date,
    postponedUntil: Date,
  },
  { timestamps: true }
);

Day.index({ userId: 1, date: 1, type: 1 }, { unique: true });

export default model<IDay>("Day", Day);
