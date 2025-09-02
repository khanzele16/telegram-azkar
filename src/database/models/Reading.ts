import { model, Schema, Types } from "mongoose";

export interface IReading {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  status: "pending" | "read" | "skipped" | "postponed";
  readCount: number;
  azkarIds?: Types.ObjectId[];
  startedAt?: Date;
  finishedAt?: Date;
  postponedUntil?: Date;
}

const ReadingSchema = new Schema<IReading>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true, index: true },
  status: { type: String, enum: ["pending", "read", "skipped", "postponed"], default: "pending" },
  readCount: { type: Number, default: 0 },
  azkarIds: [{ type: Schema.Types.ObjectId, ref: "Azkar" }],
  startedAt: Date,
  finishedAt: Date,
  postponedUntil: Date,
}, { timestamps: true, collection: "readings" });

ReadingSchema.index({ userId: 1, date: 1 }, { unique: true });

export default model<IReading>("Reading", ReadingSchema);