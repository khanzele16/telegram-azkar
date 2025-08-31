import { model, Schema } from "mongoose";
import { IAzkar } from "../../types/models";

const Azkar = new Schema<IAzkar>(
  {
    text: {
      type: String,
      required: true,
      unique: true,
    },
    audio: {
      type: String,
    },
    category: {
      type: String,
      required: true,
    },
    translation: {
      type: String,
      required: true,
    },
    transcription: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IAzkar>("Azkar", Azkar);
