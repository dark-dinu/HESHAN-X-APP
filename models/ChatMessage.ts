import mongoose, { Schema, models, model } from 'mongoose'

const ChatMessageSchema = new Schema({
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  role: { type: String, default: 'normal' }, // 'owner' | 'premium' | 'normal'
  text: { type: String, required: true, maxlength: 500 },
  replyTo: {
    id: { type: String },
    userName: { type: String },
    text: { type: String },
  },
  // MongoDB automatically deletes this message 24 hours (86400 seconds) after creation
  createdAt: { type: Date, default: Date.now, expires: 86400 },
})

export default models.ChatMessage || model('ChatMessage', ChatMessageSchema)
