import mongoose from 'mongoose'

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/heshan_ofc_db?retryWrites=true&w=majority&appName=Cluster0'

let cached = (global as any).mongoose || { conn: null, promise: null }
;(global as any).mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: 'heshan_ofc_db',
      bufferCommands: false,
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}
