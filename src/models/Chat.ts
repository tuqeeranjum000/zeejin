import mongoose, { Schema, Model } from 'mongoose';

export interface IAttachedFile {
  _id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedFiles?: IAttachedFile[];
}

export interface IChat {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachedFileSchema = new Schema<IAttachedFile>({
  _id: String,
  name: String,
  size: Number,
  type: String,
  url: String,
  uploadedAt: String,
});

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  attachedFiles: [AttachedFileSchema],
});

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Chat',
    },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation in development
const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;
