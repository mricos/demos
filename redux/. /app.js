document.getElementById('path-manager').textContent = '/relativePath/to/file.md';
document.getElementById('auth-manager').textContent = 'Not logged in';

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#444';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = '24px monospace';
ctx.fillStyle = '#fff';
ctx.fillText('Redux Canvas App', 32, 80);
