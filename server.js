require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 3e7
});

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/dhchat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('DH-CHAT Database Connected! ✅'))
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
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('DhProUser', userSchema);

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  text: { type: String, default: null },
  image: { type: String, default: null },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete in 10 minutes (RAM safe)
});
const Message = mongoose.model('DhProMessage', messageSchema);

// Auth Endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'All fields are required.' });

    const cleanPhone = phone.trim();
    const exists = await User.findOne({ phone: cleanPhone });
    if (exists) return res.status(400).json({ error: 'Phone number already registered.' });

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

// Profile Update API
app.post('/api/profile/update', async (req, res) => {
  try {
    const { phone, name, about, avatar, links } = req.body;
    const update = {};
    if (name) update.name = name;
    if (about !== undefined) update.about = about;
    if (avatar) update.avatar = avatar;
    if (links !== undefined) update.links = links;

    const user = await User.findOneAndUpdate({ phone }, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User missing' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search API
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

// Messages API
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

// Real-time Sockets
const activeSockets = {};

io.on('connection', (socket) => {
  socket.on('register-socket', (phone) => {
    activeSockets[phone] = socket.id;
    io.emit('online-peers', Object.keys(activeSockets));
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
    io.emit('online-peers', Object.keys(activeSockets));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`DH CHAT Server listening on port ${PORT}`));
