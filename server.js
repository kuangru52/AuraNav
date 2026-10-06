import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

// 捕获未捕获异常，防止容器崩溃停止
process.on('uncaughtException', (err) => {
  console.error('[AuraNav Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[AuraNav Error] Unhandled Rejection:', reason);
});

// CRC32 Table & Checksum
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32Checksum(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createZipBuffer(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.filename.replace(/\\/g, '/'), 'utf-8');
    const rawData = entry.data;
    const compressedData = zlib.deflateRawSync(rawData);

    const crc32 = crc32Checksum(rawData);
    const uncompressedSize = rawData.length;
    const compressedSize = compressedData.length;

    // Local file header (PK\x03\x04)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([localHeader, fileNameBuf, compressedData]);
    localHeaders.push(localEntry);

    // Central directory header (PK\x01\x02)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    const centralEntry = Buffer.concat([centralHeader, fileNameBuf]);
    centralHeaders.push(centralEntry);

    offset += localEntry.length;
  }

  const centralDirBuffer = Buffer.concat(centralHeaders);
  const localHeadersBuffer = Buffer.concat(localHeaders);

  // End of central directory record (PK\x05\x06)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localHeadersBuffer, centralDirBuffer, eocd]);
}

function extractZipBuffer(zipBuf, targetDir) {
  let offset = 0;
  let extractedCount = 0;

  while (offset < zipBuf.length - 30) {
    const sig = zipBuf.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      break;
    }

    const compMethod = zipBuf.readUInt16LE(offset + 8);
    const compSize = zipBuf.readUInt32LE(offset + 18);
    const fileNameLen = zipBuf.readUInt16LE(offset + 26);
    const extraLen = zipBuf.readUInt16LE(offset + 28);

    const fileName = zipBuf.toString('utf-8', offset + 30, offset + 30 + fileNameLen);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const compData = zipBuf.subarray(dataStart, dataStart + compSize);

    if (fileName && !fileName.endsWith('/')) {
      let fileData = null;
      try {
        if (compMethod === 8) {
          fileData = zlib.inflateRawSync(compData);
        } else if (compMethod === 0) {
          fileData = compData;
        }
      } catch {}

      if (fileData) {
        const safeName = path.basename(fileName);
        const destPath = path.join(targetDir, safeName);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destPath, fileData);
        extractedCount++;
      }
    }

    offset = dataStart + compSize;
  }

  return extractedCount;
}

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

  // 备份与恢复模块 1: 网站卡片 JSON
  if (cleanUrl === '/api/backup/cards' && req.method === 'GET') {
    try {
      const data = fs.existsSync(SYNC_FILE) ? fs.readFileSync(SYNC_FILE, 'utf-8') : JSON.stringify(DEFAULT_CARDS_DATA, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="auranav-cards-${dateStr}.json"`,
      });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (cleanUrl === '/api/restore/cards' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = JSON.parse(body || '{}');
        if (!json || (!Array.isArray(json.cards) && !Array.isArray(json))) {
          throw new Error('无效的网站卡片数据格式');
        }
        fs.writeFileSync(SYNC_FILE, body, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: '网站卡片还原成功' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 备份与恢复模块 2: 系统配置 JSON
  if (cleanUrl === '/api/backup/config' && req.method === 'GET') {
    try {
      const data = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf-8') : '{}';
      const dateStr = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="auranav-config-${dateStr}.json"`,
      });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (cleanUrl === '/api/restore/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        JSON.parse(body || '{}');
        fs.writeFileSync(CONFIG_FILE, body, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: '系统配置还原成功' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 备份与恢复模块 3: 图标包 ZIP
  if (cleanUrl === '/api/backup/icons' && req.method === 'GET') {
    try {
      const entries = [];
      if (fs.existsSync(ICONS_DIR)) {
        const files = fs.readdirSync(ICONS_DIR);
        for (const f of files) {
          const fp = path.join(ICONS_DIR, f);
          if (fs.statSync(fp).isFile()) {
            entries.push({ filename: f, data: fs.readFileSync(fp) });
          }
        }
      }
      const zipBuf = createZipBuffer(entries);
      const dateStr = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="auranav-icons-${dateStr}.zip"`,
        'Content-Length': zipBuf.length,
      });
      res.end(zipBuf);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (cleanUrl === '/api/restore/icons' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const zipBuf = Buffer.concat(chunks);
        if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
        const count = extractZipBuffer(zipBuf, ICONS_DIR);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, count, message: `成功恢复 ${count} 个图标` }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 备份与恢复模块 4: 壁纸包 ZIP
  if (cleanUrl === '/api/backup/wallpapers' && req.method === 'GET') {
    try {
      const entries = [];
      if (fs.existsSync(WALLPAPERS_DIR)) {
        const files = fs.readdirSync(WALLPAPERS_DIR);
        for (const f of files) {
          const fp = path.join(WALLPAPERS_DIR, f);
          if (fs.statSync(fp).isFile()) {
            entries.push({ filename: f, data: fs.readFileSync(fp) });
          }
        }
      }
      const zipBuf = createZipBuffer(entries);
      const dateStr = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="auranav-wallpapers-${dateStr}.zip"`,
        'Content-Length': zipBuf.length,
      });
      res.end(zipBuf);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (cleanUrl === '/api/restore/wallpapers' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const zipBuf = Buffer.concat(chunks);
        if (!fs.existsSync(WALLPAPERS_DIR)) fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });
        const count = extractZipBuffer(zipBuf, WALLPAPERS_DIR);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, count, message: `成功恢复 ${count} 张壁纸` }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 备份与恢复模块 5: 全量完整备份 ZIP
  if (cleanUrl === '/api/backup/full' && req.method === 'GET') {
    try {
      const entries = [];
      if (fs.existsSync(SYNC_FILE)) {
        entries.push({ filename: 'sync.json', data: fs.readFileSync(SYNC_FILE) });
      }
      if (fs.existsSync(CONFIG_FILE)) {
        entries.push({ filename: 'config.json', data: fs.readFileSync(CONFIG_FILE) });
      }
      if (fs.existsSync(ICONS_DIR)) {
        for (const f of fs.readdirSync(ICONS_DIR)) {
          const fp = path.join(ICONS_DIR, f);
          if (fs.statSync(fp).isFile()) {
            entries.push({ filename: `icons/${f}`, data: fs.readFileSync(fp) });
          }
        }
      }
      if (fs.existsSync(WALLPAPERS_DIR)) {
        for (const f of fs.readdirSync(WALLPAPERS_DIR)) {
          const fp = path.join(WALLPAPERS_DIR, f);
          if (fs.statSync(fp).isFile()) {
            entries.push({ filename: `wallpapers/${f}`, data: fs.readFileSync(fp) });
          }
        }
      }
      const zipBuf = createZipBuffer(entries);
      const dateStr = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="auranav-full-backup-${dateStr}.zip"`,
        'Content-Length': zipBuf.length,
      });
      res.end(zipBuf);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (cleanUrl === '/api/restore/full' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const zipBuf = Buffer.concat(chunks);
        const count = extractZipBuffer(zipBuf, DATA_DIR);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, count, message: '全量数据还原成功！' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
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
