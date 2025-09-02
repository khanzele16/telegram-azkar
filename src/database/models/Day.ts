import { model, Schema } from "mongoose";
import { IDay } from "../../types/models";

const Day = new Schema<IDay>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    azkarsId: [{
      type: Schema.Types.ObjectId,
      ref: "Azkar",
      required: true,
    }],
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    type: { type: String, enum: ["morning", "evening"], required: true },
  },
  {
    timestamps: true,
  }
);

export default model<IDay>("Day", Day);
