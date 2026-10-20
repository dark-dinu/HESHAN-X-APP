require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ limit: '40mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 4e7
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/dhchat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('DH-CHAT Engine Online & Connected! ✅'))
  .catch(err => console.error('Database connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, default: '' },
  avatar: { type: String, default: '/logo.png' },
  about: { type: String, default: 'Hey there! I am using DH Chat.' },
  links: { type: String, default: '' },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('DhProUser', userSchema);

// Message Schema - Auto delete in 1 Hour (3600 seconds)
const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String, default: null },
  image: { type: String, default: null },
  audio: { type: String, default: null },
  time: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 HOUR
});
const Message = mongoose.model('DhProMessage', messageSchema);

// Auth Endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'All fields required.' });

    const cleanPhone = phone.trim();
    const exists = await User.findOne({ phone: cleanPhone });
    if (exists) return res.status(400).json({ error: 'Phone already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      phone: cleanPhone,
      password: hashedPassword,
      username: name.trim().toLowerCase().replace(/\s+/g, '_'),
      avatar: '/logo.png'
    });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone: phone ? phone.trim() : '' });
    if (!user) return res.status(400).json({ error: 'Account not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect passcode.' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { name: { $regex: q,$options: 'i' } },
        { phone: { $regex: q,$options: 'i' } }
      ]
    }).select('-password').limit(15);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    const messages = await Message.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket Realtime Hub
const activeSockets = {}; // { phone: socketId }

io.on('connection', (socket) => {
  socket.on('register-socket', async (phone) => {
    activeSockets[phone] = socket.id;
    io.emit('online-peers', Object.keys(activeSockets));
  });

  // Sending message
  socket.on('private-message', async (data) => {
    const { from, to, text, image, audio } = data;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Check if recipient is online
    const isRecipientOnline = !!activeSockets[to];
    const initialStatus = isRecipientOnline ? 'delivered' : 'sent';

    const newMsg = new Message({
      from,
      to,
      text,
      image,
      audio,
      time: timeNow,
      status: initialStatus
    });
    await newMsg.save();

    const payload = {
      _id: newMsg._id,
      from,
      to,
      text,
      image,
      audio,
      time: timeNow,
      status: initialStatus
    };

    if (activeSockets[to]) {
      io.to(activeSockets[to]).emit('receive-private-message', payload);
    }
    socket.emit('message-sent', payload);
  });

  // Read / Seen receipts (Blue Ticks)
  socket.on('mark-as-read', async ({ senderPhone, readerPhone }) => {
    await Message.updateMany(
      { from: senderPhone, to: readerPhone, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );
    if (activeSockets[senderPhone]) {
      io.to(activeSockets[senderPhone]).emit('messages-seen', { by: readerPhone });
    }
  });

  // Delete message for everyone
  socket.on('delete-message', async ({ messageId, to }) => {
    try {
      await Message.findByIdAndDelete(messageId);
      socket.emit('message-deleted', { messageId });
      if (activeSockets[to]) {
        io.to(activeSockets[to]).emit('message-deleted', { messageId });
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('disconnect', async () => {
    let disconnectedPhone = null;
    for (let phone in activeSockets) {
      if (activeSockets[phone] === socket.id) {
        disconnectedPhone = phone;
        delete activeSockets[phone];
        break;
      }
    }
    if (disconnectedPhone) {
      await User.findOneAndUpdate({ phone: disconnectedPhone }, { lastSeen: new Date() });
      io.emit('online-peers', Object.keys(activeSockets));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
