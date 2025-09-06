import { model, Schema } from "mongoose";
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
    type: { type: String, enum: ["morning", "evening"], required: true },
    status: {
      type: String,
      enum: ["pending", "read", "skipped", "postponed"],
      default: "pending",
    },
    azkarIds: [{ type: Schema.Types.ObjectId, ref: "Azkar" }],
    startedAt: Date,
    finishedAt: Date,
    postponedUntil: Date,
  },
  {
    timestamps: true,
  }
);

export default model<IDay>("Day", Day);
