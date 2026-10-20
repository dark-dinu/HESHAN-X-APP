require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

// 50MB payload limits for ultra HD images & canvas DPs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  maxHttpBufferSize: 5e7 // 50MB buffer
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/dhchat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('DH-CHAT Official Engine Connected ✅'))
  .catch(err => console.error('DB Error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: 'Available' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('DhOfficialUser', userSchema);

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String, default: null },
  image: { type: String, default: null },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 Min auto-delete (RAM safe)
});
const Message = mongoose.model('DhOfficialMessage', messageSchema);

// Auth APIs
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'All fields are mandatory.' });

    const cleanPhone = phone.trim();
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) return res.status(400).json({ error: 'Phone number already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name: name.trim(), phone: cleanPhone, password: hashedPassword });
    await user.save();

    res.json({ success: true, user: { name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar } });
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
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

    res.json({ success: true, user: { name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);
    const users = await User.find({
      $or: [
        { name: { $regex: query,$options: 'i' } },
        { phone: { $regex: query,$options: 'i' } }
      ]
    }).select('name phone avatar bio').limit(15);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile & DP (Direct base64 storage)
app.post('/api/profile/update', async (req, res) => {
  try {
    const { phone, avatar, bio, name } = req.body;
    const updateFields = {};
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (bio !== undefined) updateFields.bio = bio;
    if (name !== undefined) updateFields.name = name;

    const user = await User.findOneAndUpdate({ phone }, updateFields, { new: true }).select('name phone avatar bio');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load Private Chat
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

// Socket Logic
const activeSockets = {};

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

    if (activeSockets[to]) {
      io.to(activeSockets[to]).emit('receive-private-message', payload);
    }
    socket.emit('message-sent', payload);
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
server.listen(PORT, () => console.log(`DH-CHAT Official Server on Port ${PORT}`));
