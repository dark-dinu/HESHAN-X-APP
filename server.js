require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Payload size (ඡායාරූප සඳහා)
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // 10 MB
});

app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection URI (dhchat නමින් වෙනම database එකකට සම්බන්ධ වේ)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/dhchat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Database එකට සාර්ථකව සම්බන්ධ විය! ✅'))
    .catch((err) => console.error('MongoDB සම්බන්ධතා දෝෂය:', err));

// Chat Message Schema (නව Collection එකක් ලෙස නිර්මාණය වේ)
const messageSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, default: null },
    image: { type: String, default: null },
    time: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('DhMessage', messageSchema);

let onlineUsers = {};

io.on('connection', async (socket) => {
    // පරිශීලකයා සම්බන්ධ වූ විට පැරණි පණිවිඩ පමණක් ලබා ගැනීම (දත්ත වෙනස් නොවේ)
    try {
        const history = await Message.find().sort({ createdAt: 1 }).limit(50);
        socket.emit('load-history', history);
    } catch (err) {
        console.error("ඉතිහාසය ලබා ගැනීමේ දෝෂය:", err);
    }

    // පරිශීලකයා එක්වීම
    socket.on('user-joined', (username) => {
        onlineUsers[socket.id] = username || 'Guest';
        io.emit('update-users', Object.values(onlineUsers));
        socket.broadcast.emit('system-message', `${onlineUsers[socket.id]} සම්බන්ධ විය!`);
    });

    // නව පණිවිඩයක් පැමිණි විට සුරැකීම
    socket.on('chat-message', async (data) => {
        try {
            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const newMsg = new Message({
                user: data.user,
                text: data.text || null,
                image: data.image || null,
                time: timeNow
            });

            await newMsg.save();

            io.emit('chat-message', {
                user: newMsg.user,
                text: newMsg.text,
                image: newMsg.image,
                time: newMsg.time
            });
        } catch (error) {
            console.error("පණිවිඩය සුරැකීමේ දෝෂය:", error);
        }
    });

    // ටයිප් කිරීමේ තත්ත්වය
    socket.on('typing', (isTyping) => {
        socket.broadcast.emit('user-typing', {
            user: onlineUsers[socket.id],
            typing: isTyping
        });
    });

    // සම්බන්ධතාවය විසන්ධි වීම
    socket.on('disconnect', () => {
        const user = onlineUsers[socket.id];
        if (user) {
            delete onlineUsers[socket.id];
            io.emit('update-users', Object.values(onlineUsers));
            socket.broadcast.emit('system-message', `${user} ඉවත් විය.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`DH CHAT සේවාදායකය port ${PORT} මත ධාවනය වේ`);
});
