import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;
const PUBLIC_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const ICONS_DIR = path.join(DATA_DIR, 'icons');
const WALLPAPERS_DIR = path.join(DATA_DIR, 'wallpapers');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SYNC_FILE = path.join(DATA_DIR, 'sync.json');

// Ensure required data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(WALLPAPERS_DIR)) fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });

// Read Admin credentials from environment variables (defaults: admin / admin123)
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

const ADMIN_USER = getAdminUser();
const ADMIN_PASSWORD = getAdminPassword();

// Default initial cards data (GitHub, Bilibili, Zhihu)
const DEFAULT_CARDS_DATA = {
  version: '1.0',
  groups: ['开发', '娱乐', '阅读'],
  cards: [
    {
      id: '1',
      title: 'GitHub',
      url: 'https://github.com',
      description: '全球最大的开源软件代码托管与协同开发平台',
      icon: 'https://github.githubassets.com/favicons/favicon.svg',
      category: '开发',
      accent: '',
    },
    {
      id: '2',
      title: '哔哩哔哩 (Bilibili)',
      url: 'https://www.bilibili.com',
      description: '国内知名年轻人文化弹幕视频分享与学习社区',
      icon: 'https://www.bilibili.com/favicon.ico',
      category: '娱乐',
      accent: '',
    },
    {
      id: '3',
      title: '知乎 (Zhihu)',
      url: 'https://www.zhihu.com',
      description: '中文互联网高质量问答与知识创作者分享平台',
      icon: 'https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.abcdef.png',
      category: '阅读',
      accent: '',
    },
  ],
};

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function compareSemver(v1, v2) {
  const parse = v => v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const cleanUrl = parsedUrl.pathname;

  // Docker Hub 远程 Tag 版本更新检测接口
  if (cleanUrl === '/api/check-update') {
    const options = {
      hostname: 'hub.docker.com',
      path: '/v2/repositories/kuangru52/auranav/tags?page_size=25',
      headers: { 'User-Agent': 'AuraNav-Server' },
      timeout: 8000,
    };

    const reqTag = https.get(options, (tagRes) => {
      let data = '';
      tagRes.on('data', chunk => { data += chunk; });
      tagRes.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (json && Array.isArray(json.results)) {
            let highestTag = '';
            for (const t of json.results) {
              if (t.name && t.name !== 'latest' && /^\d+\.\d+/.test(t.name)) {
                if (!highestTag || compareSemver(t.name, highestTag) > 0) {
                  highestTag = t.name;
                }
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, latestVersion: highestTag || null }));
            return;
          }
        } catch {}
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: '无法解析 Docker Hub 数据' }));
      });
    });

    reqTag.on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    });
    reqTag.on('timeout', () => {
      reqTag.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: '连接 Docker Hub 超时' }));
    });
    return;
  }

  // Bing 每日壁纸官方 API 反向代理
  if (cleanUrl === '/api/bing-wallpaper') {
    const queryStr = parsedUrl.searchParams.toString() || 'format=js&idx=0&n=1&mkt=zh-CN';
    const bingApiUrl = `https://www.bing.com/HPImageArchive.aspx?${queryStr}`;
    https.get(bingApiUrl, (bingRes) => {
      let data = '';
      bingRes.on('data', chunk => { data += chunk; });
      bingRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    }).on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // 1. API: Login Authentication
  if (cleanUrl === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const inputUser = (username || '').trim();
        const inputPass = (password || '').trim();

        if (inputUser.toLowerCase() === ADMIN_USER.toLowerCase() && inputPass === ADMIN_PASSWORD) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, user: { username: ADMIN_USER, isAdmin: true } }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: '用户名或密码错误' }));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 2. API: Cards & Groups Data Sync (sync.json)
  if (cleanUrl === '/api/sync') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          fs.writeFileSync(SYNC_FILE, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'sync.json 保存成功' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET') {
      try {
        if (fs.existsSync(SYNC_FILE)) {
          const data = fs.readFileSync(SYNC_FILE, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(data);
        } else {
          // 初始化默认 sync.json 数据
          fs.writeFileSync(SYNC_FILE, JSON.stringify(DEFAULT_CARDS_DATA, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(DEFAULT_CARDS_DATA));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
      return;
    }
  }

  // 3. API: Configuration Parameters Sync (config.json)
  if (cleanUrl === '/api/config') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          fs.writeFileSync(CONFIG_FILE, body, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'config.json 保存成功' }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET') {
      try {
        if (fs.existsSync(CONFIG_FILE)) {
          const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
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

  // 4. API: Upload Icon or Wallpaper to data/icons/ or data/wallpapers/
  if (cleanUrl === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { type, base64 } = JSON.parse(body || '{}');
        if (!base64) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: '缺少图片数据' }));
          return;
        }
        const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let ext = '.png';
        let buffer;
        if (matches && matches.length === 3) {
          if (matches[1] === 'image/jpeg') ext = '.jpg';
          else if (matches[1] === 'image/webp') ext = '.webp';
          else if (matches[1] === 'image/gif') ext = '.gif';
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        }

        const targetSubDir = type === 'wallpaper' ? WALLPAPERS_DIR : ICONS_DIR;
        if (!fs.existsSync(targetSubDir)) fs.mkdirSync(targetSubDir, { recursive: true });

        const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const targetPath = path.join(targetSubDir, safeName);
        fs.writeFileSync(targetPath, buffer);

        const relativeUrl = `/data/${type === 'wallpaper' ? 'wallpapers' : 'icons'}/${safeName}`;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, url: relativeUrl }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 5. Static files serving from data/ (data/icons/ and data/wallpapers/)
  if (cleanUrl.startsWith('/data/')) {
    const subPath = cleanUrl.replace(/^\/data\//, '');
    const targetFilePath = path.join(DATA_DIR, subPath);
    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      const ext = path.extname(targetFilePath);
      const cType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': cType });
      res.end(fs.readFileSync(targetFilePath));
      return;
    }
  }

  // 6. SPA Static files serving from dist/
  let filePath = path.join(PUBLIC_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
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
  console.log(`AuraNav Server running at http://localhost:${PORT}/`);
  console.log(`Admin User: ${ADMIN_USER}`);
});
