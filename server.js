const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Isolated Database Connection ---
// අනිත් data වලට බාධා නොවෙන්න වෙනම database එකක් (whatsapp_clone_db) specify කර ඇත
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/whatsapp_clone_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected to whatsapp_clone_db successfully!'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- Schemas & Models ---
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

// විනාඩි 10 න් auto delete වන TTL Index එක
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'wa_secure_session_key_2026',
  resave: false,
  saveUninitialized: false
}));

// --- Authentication & User Endpoints ---
app.post('/api/register', async (req, res) => {
  try {
    const { phone, name, password, dp } = req.body;
    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Phone, Name, and Password are required' });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      phone,
      name,
      password: hashedPassword,
      dp: dp || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'
    });
    await user.save();
    res.json({ message: 'User registered successfully' });
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
    if (!match) return res.status(400).json({ error: 'Invalid password' });

    req.session.user = { phone: user.phone, name: user.name, dp: user.dp };
    res.json({ user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/users/search', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json([]);
  const users = await User.find({ phone: { $regex: phone,$options: 'i' } }).select('phone name dp');
  res.json(users);
});

app.get('/api/messages/:otherPhone', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const myPhone = req.session.user.phone;
  const otherPhone = req.params.otherPhone;

  const messages = await Message.find({
    $or: [
      { sender: myPhone, receiver: otherPhone },
      { sender: otherPhone, receiver: myPhone }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

// --- Real-time Socket.IO Logic ---
const onlineUsers = new Map(); // phone -> socket.id

io.on('connection', (socket) => {
  socket.on('register_user', (phone) => {
    onlineUsers.set(phone, socket.id);
  });

  socket.on('send_message', async ({ sender, receiver, text, isSaved }) => {
    // isSaved true නම් expire වෙන්නේ නෑ (null). 
    // false නම් හරියටම විනාඩි 10 කින් (600,000 ms) Mongo එකෙන් delete වෙනවා.
    const expiresAt = isSaved ? null : new Date(Date.now() + 10 * 60 * 1000);

    const msg = new Message({
      sender,
      receiver,
      text,
      isSaved,
      expiresAt
    });
    await msg.save();

    const targetSocketId = onlineUsers.get(receiver);
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive_message', msg);
    }
    socket.emit('message_sent', msg);
  });

  socket.on('disconnect', () => {
    for (let [phone, id] of onlineUsers.entries()) {
      if (id === socket.id) onlineUsers.delete(phone);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
