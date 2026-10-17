const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/whatsapp_clone_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  dp: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }
}, { collection: 'wa_users' });

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  text: { type: String, required: true },
  isSaved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }
}, { collection: 'wa_messages' });

messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'crimson_vip_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Auth
app.post('/api/register', async (req, res) => {
  try {
    const { phone, name, password, dp } = req.body;
    if (!phone || !password || !name) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ phone, name, password: hashedPassword, dp: dp || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' });
    await user.save();
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong password' });

    res.json({ user: { phone: user.phone, name: user.name, dp: user.dp } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/profile/update', async (req, res) => {
  const { phone, name, dp } = req.body;
  try {
    const user = await User.findOneAndUpdate({ phone }, { name, dp }, { new: true });
    res.json({ user: { phone: user.phone, name: user.name, dp: user.dp } });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.get('/api/users/search', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json([]);
  const users = await User.find({ phone: { $regex: phone, $options: 'i' } }).select('phone name dp');
  res.json(users);
});

app.get('/api/messages/:myPhone/:otherPhone', async (req, res) => {
  const { myPhone, otherPhone } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: myPhone, receiver: otherPhone },
      { sender: otherPhone, receiver: myPhone }
    ]
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.post('/api/messages/clear', async (req, res) => {
  const { myPhone, otherPhone } = req.body;
  await Message.deleteMany({
    $or: [
      { sender: myPhone, receiver: otherPhone },
      { sender: otherPhone, receiver: myPhone }
    ]
  });
  res.json({ success: true });
});

// Real-Time Socket
const onlineUsers = new Map(); // phone -> socket.id

function broadcastOnlineList() {
  io.emit('online_users_list', Array.from(onlineUsers.keys()));
}

io.on('connection', (socket) => {
  socket.on('register_user', (phone) => {
    socket.phone = phone;
    onlineUsers.set(phone, socket.id);
    broadcastOnlineList();
  });

  socket.on('send_message', async ({ sender, receiver, text, isSaved }) => {
    if (!sender || !receiver || !text.trim()) return;

    const expiresAt = isSaved ? null : new Date(Date.now() + 10 * 60 * 1000);
    const msg = new Message({
      sender,
      receiver,
      text: text.trim(),
      isSaved,
      expiresAt
    });
    await msg.save();

    // Receiver ගේ socket id එකට direct notification යවනවා
    const targetSocketId = onlineUsers.get(receiver);
    if (targetSocketId) {
      io.to(targetSocketId).emit('chat_message', msg);
    }
    // Sender ට emit කරනවා
    socket.emit('chat_message', msg);
  });

  socket.on('typing', ({ sender, receiver }) => {
    const targetSocketId = onlineUsers.get(receiver);
    if (targetSocketId) {
      io.to(targetSocketId).emit('user_typing', { sender });
    }
  });

  socket.on('stop_typing', ({ sender, receiver }) => {
    const targetSocketId = onlineUsers.get(receiver);
    if (targetSocketId) {
      io.to(targetSocketId).emit('user_stop_typing', { sender });
    }
  });

  // Calls
  socket.on('call_user', ({ callerPhone, callerName, callerDp, receiverPhone }) => {
    const targetSocketId = onlineUsers.get(receiverPhone);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming_call', {
        callerPhone, callerName, callerDp, fromSocketId: socket.id
      });
    } else {
      socket.emit('call_failed', { reason: 'User is offline' });
    }
  });

  socket.on('accept_call', ({ toSocketId }) => {
    io.to(toSocketId).emit('call_accepted', { fromSocketId: socket.id });
  });

  socket.on('reject_call', ({ toSocketId }) => {
    io.to(toSocketId).emit('call_rejected');
  });

  socket.on('end_call', ({ toSocketId }) => {
    io.to(toSocketId).emit('call_ended');
  });

  socket.on('webrtc_signal', ({ toSocketId, signal }) => {
    io.to(toSocketId).emit('webrtc_signal', { signal, fromSocketId: socket.id });
  });

  socket.on('disconnect', () => {
    if (socket.phone) {
      onlineUsers.delete(socket.phone);
      broadcastOnlineList();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
