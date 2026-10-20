require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e7 }); // 10MB images

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/dhchat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected to DHCHAT Database! 🔥'))
  .catch(err => console.error('MongoDB Error:', err));

// --- Schemas ---
// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
  bio: { type: String, default: 'Using DH CHAT 🔥' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('DhUser', userSchema);

// 2. Private Message Schema with TTL (Auto-delete in 10 mins = 600 seconds)
const messageSchema = new mongoose.Schema({
  from: { type: String, required: true }, // phone
  to: { type: String, required: true },   // phone
  text: { type: String, default: null },
  image: { type: String, default: null },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minutes auto-delete! ⚡
});
const Message = mongoose.model('DhPrivateMessage', messageSchema);

// --- Auth Endpoints ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'සියලුම තොරතුරු ඇතුළත් කරන්න!' });

    const cleanPhone = phone.trim();
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) return res.status(400).json({ error: 'මේ දුරකථන අංකය දැනටමත් භාවිතයේ ඇත!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name: name.trim(), phone: cleanPhone, password: hashedPassword });
    await user.save();

    res.json({ success: true, user: { name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const cleanPhone = phone ? phone.trim() : '';
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) return res.status(400).json({ error: 'මෙම අංකයෙන් ගිණුමක් සොයාගත නොහැක!' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'මුරපදය වැරදියි!' });

    res.json({ success: true, user: { name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Search User by Name or Phone
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);
    const users = await User.find({
      $or: [
        { name: { $regex: query,$options: 'i' } },
        { phone: { $regex: query,$options: 'i' } }
      ]
    }).select('name phone avatar bio').limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.post('/api/profile/update', async (req, res) => {
  try {
    const { phone, name, bio, avatar } = req.body;
    const updated = await User.findOneAndUpdate(
      { phone },
      { name, bio, ...(avatar && { avatar }) },
      { new: true }
    ).select('name phone avatar bio');
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load Private Chat History between 2 users
app.get('/api/messages', async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) return res.json([]);
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

// --- Realtime Socket ---
const activeSockets = {}; // { phone: socketId }

io.on('connection', (socket) => {
  socket.on('register-socket', (phone) => {
    activeSockets[phone] = socket.id;
    io.emit('online-status', Object.keys(activeSockets));
  });

  socket.on('private-message', async (data) => {
    const { from, to, text, image } = data;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = new Message({ from, to, text, image, time: timeNow });
    await newMsg.save();

    const payload = { from, to, text, image, time: timeNow, _id: newMsg._id };

    // Send to recipient if online
    if (activeSockets[to]) {
      io.to(activeSockets[to]).emit('receive-private-message', payload);
    }
    // Echo back to sender
    socket.emit('message-sent', payload);
  });

  socket.on('typing', ({ from, to, isTyping }) => {
    if (activeSockets[to]) {
      io.to(activeSockets[to]).emit('user-typing', { from, isTyping });
    }
  });

  socket.on('disconnect', () => {
    for (let phone in activeSockets) {
      if (activeSockets[phone] === socket.id) {
        delete activeSockets[phone];
        break;
      }
    }
    io.emit('online-status', Object.keys(activeSockets));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`DH CHAT Running on ${PORT} 🚀`));
