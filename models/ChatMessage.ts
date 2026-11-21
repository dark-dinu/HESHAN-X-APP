import mongoose, { Schema, Model, models, model } from 'mongoose'

export interface IChatMessage {
  userEmail: string
  userName: string
  role: string
  text: string
  replyTo?: {
    id?: string
    userName?: string
    text?: string
  }
  createdAt: Date
}

const ChatMessageSchema = new Schema<IChatMessage>({
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  role: { type: String, default: 'normal' },
  text: { type: String, required: true, maxlength: 500 },
  replyTo: {
    id: { type: String },
    userName: { type: String },
    text: { type: String },
  },
  // Automatically deletes the document 24 hours (86400 seconds) after creation
  createdAt: { type: Date, default: Date.now, expires: 86400 },
})

const ChatMessage: Model<IChatMessage> =
  (models.ChatMessage as Model<IChatMessage>) ||
  model<IChatMessage>('ChatMessage', ChatMessageSchema)

export default ChatMessage
