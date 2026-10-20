const user = JSON.parse(localStorage.getItem('dh_user') || 'null');
if (!user) window.location.replace('/login.html');

function renderProfile() {
    document.getElementById('dispName').innerText = user.name || 'User';
    document.getElementById('dispPhone').innerText = user.phone || '';
    document.getElementById('dispUsername').innerText = '@' + (user.username || user.name.toLowerCase().replace(/\s+/g, '_'));
    document.getElementById('dispAbout').innerText = user.about || 'Set About';
    document.getElementById('dispLinks').innerText = user.links || 'Add links';
    if (user.avatar) document.getElementById('profileImage').src = user.avatar;
}
renderProfile();

// Canvas compression for DP: Fast & High Quality
function handleDpChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const size = 350; // optimized square
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            const minSide = Math.min(img.width, img.height);
            const startX = (img.width - minSide) / 2;
            const startY = (img.height - minSide) / 2;

            ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, size, size);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);

            // Save to DB
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: user.phone, avatar: compressed })
            });
            const data = await res.json();
            if (data.success) {
                user.avatar = compressed;
                localStorage.setItem('dh_user', JSON.stringify(user));
                document.getElementById('profileImage').src = compressed;
                alert('Profile photo updated successfully!');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Edit Name / About / Links
async function editField(field) {
    let currentVal = user[field] || '';
    let promptText = `Enter new ${field}:`;
    let newVal = prompt(promptText, currentVal);

    if (newVal !== null && newVal.trim() !== '') {
        const body = { phone: user.phone };
        body[field] = newVal.trim();

        const res = await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            user[field] = newVal.trim();
            localStorage.setItem('dh_user', JSON.stringify(user));
            renderProfile();
        }
    }
}

// Change App Icon URL
function updateAppLogoUrl() {
    const url = prompt("ඔයා කැමති App Logo එකේ Image URL එක දෙන්න:");
    if (url && url.startsWith('http')) {
        localStorage.setItem('dh_app_logo', url);
        alert('App logo updated! Restarting app UI...');
        window.location.href = '/';
    }
}
