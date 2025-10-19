import mongoose, { Schema, Model } from 'mongoose';

export interface IFile {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation in development
const File: Model<IFile> = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);

export default File;
