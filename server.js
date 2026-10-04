import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;
const PUBLIC_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');

const getAdminUser = () => {
  if (process.env.ADMIN_USER && process.env.ADMIN_USER.trim()) return process.env.ADMIN_USER.trim();
  if (process.env.admin_user && process.env.admin_user.trim()) return process.env.admin_user.trim();
  if (process.env.user && process.env.user.trim() && process.env.user.trim() !== process.env.USERNAME) return process.env.user.trim();
  return 'admin';
};

const getAdminPassword = () => {
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) return process.env.ADMIN_PASSWORD.trim();
  if (process.env.admin_password && process.env.admin_password.trim()) return process.env.admin_password.trim();
  if (process.env.password && process.env.password.trim()) return process.env.password.trim();
  return 'admin123';
};

// Admin credentials from environment variables (defaults: admin / admin123)
const ADMIN_USER = getAdminUser();
const ADMIN_PASSWORD = getAdminPassword();

const USERS_FILE = fs.existsSync(DATA_DIR)
  ? path.join(DATA_DIR, 'users.json')
  : path.join(__dirname, 'users.json');

// Helper to get ordinary users list [{ username, password }]
const getOrdinaryUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
};

// Helper to save ordinary users list
const saveOrdinaryUsers = (users) => {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存普通用户列表失败:', e);
  }
};

// Helper to get user-specific sync file path
const getUserSyncFilePath = (username) => {
  const safeName = (username || 'admin').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (fs.existsSync(DATA_DIR)) {
    return path.join(DATA_DIR, `sync-${safeName}.json`);
  }
  return path.join(__dirname, `sync-${safeName}.json`);
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const cleanUrl = parsedUrl.pathname;

  // API endpoint: Get/Add/Delete Users
  if (cleanUrl === '/api/users') {
    if (req.method === 'GET') {
      const users = getOrdinaryUsers().map(u => ({ username: u.username, role: 'user' }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        adminUser: ADMIN_USER,
        ordinaryUsers: users,
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { username, password } = JSON.parse(body || '{}');
          if (!username || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '用户名和密码不能为空' }));
            return;
          }
          if (username.trim().toLowerCase() === ADMIN_USER.toLowerCase()) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '不能使用管理员用户名' }));
            return;
          }
          const currentList = getOrdinaryUsers();
          if (currentList.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '用户已存在' }));
            return;
          }
          currentList.push({ username: username.trim(), password: password.trim() });
          saveOrdinaryUsers(currentList);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: '普通用户创建成功' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { username } = JSON.parse(body || '{}');
          if (!username) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '需要提供要删除的用户名' }));
            return;
          }
          let currentList = getOrdinaryUsers();
          currentList = currentList.filter(u => u.username.toLowerCase() !== username.trim().toLowerCase());
          saveOrdinaryUsers(currentList);

          // Delete user data file if exists
          const userFile = getUserSyncFilePath(username);
          if (fs.existsSync(userFile)) {
            try { fs.unlinkSync(userFile); } catch {}
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: '用户已删除' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
  }

  // API endpoint: Login Authentication
  if (cleanUrl === '/api/login') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { username, password } = JSON.parse(body || '{}');
          const inputUser = (username || '').trim();
          const inputPass = (password || '').trim();

          // Check Admin
          if (inputUser.toLowerCase() === ADMIN_USER.toLowerCase() && inputPass === ADMIN_PASSWORD) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, user: { username: ADMIN_USER, isAdmin: true } }));
            return;
          }

          // Check Ordinary Users
          const ordinary = getOrdinaryUsers();
          const matched = ordinary.find(u => u.username.toLowerCase() === inputUser.toLowerCase() && u.password === inputPass);
          if (matched) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, user: { username: matched.username, isAdmin: false } }));
            return;
          }

          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: '用户名或密码错误' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
  }

  // API endpoint for cross-device synchronization per user
  if (cleanUrl === '/api/sync') {
    const userQuery = parsedUrl.searchParams.get('username') || ADMIN_USER;
    const targetFile = getUserSyncFilePath(userQuery);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const targetDir = path.dirname(targetFile);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.writeFileSync(targetFile, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Sync data saved on server' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET') {
      try {
        if (fs.existsSync(targetFile)) {
          const data = fs.readFileSync(targetFile, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(data);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({}));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
      return;
    }
  }

  let filePath = path.join(PUBLIC_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);

  // If file doesn't exist, fallback to index.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AuraNav Server with Multi-User Sync running at http://localhost:${PORT}/`);
  console.log(`Admin User: ${ADMIN_USER}`);
});
