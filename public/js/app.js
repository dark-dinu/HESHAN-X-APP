const user = JSON.parse(localStorage.getItem('dh_user') || 'null');
if (!user) window.location.replace('/login.html');

// Custom App Logo check
const customLogo = localStorage.getItem('dh_app_logo');
if (customLogo) {
    const logoEl = document.getElementById('customAppLogo');
    logoEl.src = customLogo;
    logoEl.style.display = 'block';
}

const socket = io();
let currentPeer = null;

// Register device to socket
socket.emit('register-socket', user.phone);
if (user.avatar) document.getElementById('myStatusImg').src = user.avatar;

function toggleMenu() {
    document.getElementById('menuDropdown').classList.toggle('show');
}
window.onclick = function(e) {
    if (!e.target.matches('.fa-ellipsis-vertical')) {
        document.getElementById('menuDropdown').classList.remove('show');
    }
}

// Live Search
let searchTimeout;
function searchLiveUsers(q) {
    clearTimeout(searchTimeout);
    const feed = document.getElementById('chatsFeed');
    if (!q.trim()) return;

    searchTimeout = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const list = await res.json();
        feed.innerHTML = '';

        list.filter(u => u.phone !== user.phone).forEach(peer => {
            const row = document.createElement('div');
            row.className = 'chat-row';
            row.innerHTML = `
                <img class="chat-row-avatar" src="${peer.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}">
                <div class="chat-row-content">
                    <div class="chat-row-title"><span>${peer.name}</span><span class="chat-row-time">Active</span></div>
                    <div class="chat-row-sub">${peer.about || peer.phone}</div>
                </div>
            `;
            row.onclick = () => openChatDeck(peer);
            feed.appendChild(row);
        });
    }, 250);
}

// Open Chat
async function openChatDeck(peer) {
    currentPeer = peer;
    document.getElementById('activeChatName').innerText = peer.name;
    document.getElementById('activeChatPhone').innerText = peer.phone;
    document.getElementById('activeChatAvatar').src = peer.avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    document.getElementById('liveChatDeck').style.display = 'flex';

    const track = document.getElementById('messageTrack');
    track.innerHTML = '';

    const res = await fetch(`/api/messages?user1=${user.phone}&user2=${peer.phone}`);
    const messages = await res.json();
    messages.forEach(m => appendBubble(m));
    track.scrollTop = track.scrollHeight;
}

function closeLiveChat() {
    currentPeer = null;
    document.getElementById('liveChatDeck').style.display = 'none';
}

// Send Message
function dispatchMsg() {
    const input = document.getElementById('liveMsgInput');
    const text = input.value.trim();
    if (!text || !currentPeer) return;

    socket.emit('private-message', {
        from: user.phone,
        to: currentPeer.phone,
        text: text
    });
    input.value = '';
}

document.getElementById('liveMsgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dispatchMsg();
});

function sendPhotoMsg(e) {
    const file = e.target.files[0];
    if (file && currentPeer) {
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('private-message', {
                from: user.phone,
                to: currentPeer.phone,
                image: reader.result
            });
        };
        reader.readAsDataURL(file);
    }
}

// Live Reception
socket.on('message-sent', (msg) => appendBubble(msg));
socket.on('receive-private-message', (msg) => {
    if (currentPeer && msg.from === currentPeer.phone) {
        appendBubble(msg);
    }
});

function appendBubble(msg) {
    const isMe = msg.from === user.phone;
    const div = document.createElement('div');
    div.style.maxWidth = '75%';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '10px';
    div.style.fontSize = '14px';
    div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
    div.style.background = isMe ? 'var(--bubble-sent)' : 'var(--bubble-received)';
    div.style.color = '#fff';

    let body = '';
    if (msg.text) body += `<div>${msg.text}</div>`;
    if (msg.image) body += `<img src="${msg.image}" style="max-width:100%; border-radius:8px; margin-top:4px;">`;
    body += `<span style="font-size:10px; color:rgba(255,255,255,0.6); float:right; margin-left:8px; margin-top:4px;">${msg.time}</span>`;

    div.innerHTML = body;
    const track = document.getElementById('messageTrack');
    track.appendChild(div);
    track.scrollTop = track.scrollHeight;
}

function logout() {
    localStorage.removeItem('dh_user');
    window.location.replace('/login.html');
}
