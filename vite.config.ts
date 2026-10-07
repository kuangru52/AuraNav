import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-ignore
import fs from 'fs'
// @ts-ignore
import path from 'path'
// @ts-ignore
import https from 'https'
// @ts-ignore
import { createZipBuffer, extractZipBuffer } from './src/utils/serverZip.js'

function fetchHttpsJson(urlStr: string, headers: any = {}) {
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore
      const parsedUrl = new (globalThis.URL || URL)(urlStr)
      const req = https.get(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {
            'User-Agent': 'AuraNav-Server',
            Accept: 'application/json, text/plain, */*',
            ...headers,
          },
          timeout: 5000,
        },
        (res: any) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchHttpsJson(res.headers.location, headers).then(resolve).catch(reject)
            return
          }
          let data = ''
          res.on('data', (chunk: any) => { data += chunk })
          res.on('end', () => {
            try {
              resolve(JSON.parse(data || '{}'))
            } catch (e) {
              reject(e)
            }
          })
        }
      )
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('请求超时'))
      })
    } catch (e) {
      reject(e)
    }
  })
}

function compareSemver(v1: string, v2: string) {
  const parse = (v: string) => v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
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

const syncPlugin = () => ({
  name: 'sync-api-plugin',
  configureServer(server: any) {
    const dataDir = path.resolve('./data')
    const iconsDir = path.join(dataDir, 'icons')
    const wallpapersDir = path.join(dataDir, 'wallpapers')
    const configFile = path.join(dataDir, 'config.json')
    const syncFile = path.join(dataDir, 'sync.json')

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
    if (!fs.existsSync(wallpapersDir)) fs.mkdirSync(wallpapersDir, { recursive: true })

    const getAdminUser = () => {
      // @ts-ignore
      const p = typeof process !== 'undefined' ? process.env : {}
      if (p.ADMIN_USER && p.ADMIN_USER.trim()) return p.ADMIN_USER.trim()
      if (p.admin_user && p.admin_user.trim()) return p.admin_user.trim()
      if (p.user && p.user.trim() && p.user.trim() !== p.USERNAME) return p.user.trim()
      return 'admin'
    }

    const getAdminPassword = () => {
      // @ts-ignore
      const p = typeof process !== 'undefined' ? process.env : {}
      if (p.ADMIN_PASSWORD && p.ADMIN_PASSWORD.trim()) return p.ADMIN_PASSWORD.trim()
      if (p.admin_password && p.admin_password.trim()) return p.admin_password.trim()
      if (p.password && p.password.trim()) return p.password.trim()
      return 'admin123'
    }

    const ADMIN_USER = getAdminUser()
    const ADMIN_PASSWORD = getAdminPassword()

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
    }

    server.middlewares.use((req: any, res: any, next: any) => {
      const rawUrl = req.url || '/'
      const cleanUrl = rawUrl.split('?')[0]

      // 备份与恢复模块 1: 网站卡片 JSON
      if (cleanUrl === '/api/backup/cards' && req.method === 'GET') {
        try {
          const data = fs.existsSync(syncFile) ? fs.readFileSync(syncFile, 'utf-8') : JSON.stringify(DEFAULT_CARDS_DATA, null, 2)
          const dateStr = new Date().toISOString().slice(0, 10)
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="auranav-cards-${dateStr}.json"`)
          res.end(data)
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
        return
      }

      if (cleanUrl === '/api/restore/cards' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', () => {
          try {
            const json = JSON.parse(body || '{}')
            if (!json || (!Array.isArray(json.cards) && !Array.isArray(json))) {
              throw new Error('无效的网站卡片数据格式')
            }
            fs.writeFileSync(syncFile, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, message: '网站卡片还原成功' }))
          } catch (e: any) {
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // 备份与恢复模块 2: 系统配置 JSON
      if (cleanUrl === '/api/backup/config' && req.method === 'GET') {
        try {
          const data = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf-8') : '{}'
          const dateStr = new Date().toISOString().slice(0, 10)
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Content-Disposition', `attachment; filename="auranav-config-${dateStr}.json"`)
          res.end(data)
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
        return
      }

      if (cleanUrl === '/api/restore/config' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', () => {
          try {
            JSON.parse(body || '{}')
            fs.writeFileSync(configFile, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, message: '系统配置还原成功' }))
          } catch (e: any) {
            res.statusCode = 400
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // 备份与恢复模块 3: 图标包 ZIP
      if (cleanUrl === '/api/backup/icons' && req.method === 'GET') {
        try {
          const entries: any[] = []
          if (fs.existsSync(iconsDir)) {
            const files = fs.readdirSync(iconsDir)
            for (const f of files) {
              const fp = path.join(iconsDir, f)
              if (fs.statSync(fp).isFile()) {
                entries.push({ filename: f, data: fs.readFileSync(fp) })
              }
            }
          }
          const zipBuf = createZipBuffer(entries)
          const dateStr = new Date().toISOString().slice(0, 10)
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', `attachment; filename="auranav-icons-${dateStr}.zip"`)
          res.end(zipBuf)
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
        return
      }

      if (cleanUrl === '/api/restore/icons' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => { chunks.push(chunk) })
        req.on('end', () => {
          try {
            // @ts-ignore
            const zipBuf = Buffer.concat(chunks)
            if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
            const count = extractZipBuffer(zipBuf, iconsDir)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, count, message: `成功恢复 ${count} 个图标` }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // 备份与恢复模块 4: 壁纸包 ZIP
      if (cleanUrl === '/api/backup/wallpapers' && req.method === 'GET') {
        try {
          const entries: any[] = []
          if (fs.existsSync(wallpapersDir)) {
            const files = fs.readdirSync(wallpapersDir)
            for (const f of files) {
              const fp = path.join(wallpapersDir, f)
              if (fs.statSync(fp).isFile()) {
                entries.push({ filename: f, data: fs.readFileSync(fp) })
              }
            }
          }
          const zipBuf = createZipBuffer(entries)
          const dateStr = new Date().toISOString().slice(0, 10)
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', `attachment; filename="auranav-wallpapers-${dateStr}.zip"`)
          res.end(zipBuf)
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
        return
      }

      if (cleanUrl === '/api/restore/wallpapers' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => { chunks.push(chunk) })
        req.on('end', () => {
          try {
            // @ts-ignore
            const zipBuf = Buffer.concat(chunks)
            if (!fs.existsSync(wallpapersDir)) fs.mkdirSync(wallpapersDir, { recursive: true })
            const count = extractZipBuffer(zipBuf, wallpapersDir)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, count, message: `成功恢复 ${count} 张壁纸` }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // 备份与恢复模块 5: 全量完整备份 ZIP
      if (cleanUrl === '/api/backup/full' && req.method === 'GET') {
        try {
          const entries: any[] = []
          if (fs.existsSync(syncFile)) {
            entries.push({ filename: 'sync.json', data: fs.readFileSync(syncFile) })
          }
          if (fs.existsSync(configFile)) {
            entries.push({ filename: 'config.json', data: fs.readFileSync(configFile) })
          }
          if (fs.existsSync(iconsDir)) {
            for (const f of fs.readdirSync(iconsDir)) {
              const fp = path.join(iconsDir, f)
              if (fs.statSync(fp).isFile()) {
                entries.push({ filename: `icons/${f}`, data: fs.readFileSync(fp) })
              }
            }
          }
          if (fs.existsSync(wallpapersDir)) {
            for (const f of fs.readdirSync(wallpapersDir)) {
              const fp = path.join(wallpapersDir, f)
              if (fs.statSync(fp).isFile()) {
                entries.push({ filename: `wallpapers/${f}`, data: fs.readFileSync(fp) })
              }
            }
          }
          const zipBuf = createZipBuffer(entries)
          const dateStr = new Date().toISOString().slice(0, 10)
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', `attachment; filename="auranav-full-backup-${dateStr}.zip"`)
          res.end(zipBuf)
        } catch (e: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: e.message }))
        }
        return
      }

      if (cleanUrl === '/api/restore/full' && req.method === 'POST') {
        const chunks: any[] = []
        req.on('data', (chunk: any) => { chunks.push(chunk) })
        req.on('end', () => {
          try {
            // @ts-ignore
            const zipBuf = Buffer.concat(chunks)
            const count = extractZipBuffer(zipBuf, dataDir)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, count, message: '全量数据还原成功！' }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // 自动检测最新版本号 (多渠道容灾：GitHub Release -> jsDelivr 镜像 -> GitHub Raw -> Docker Hub)
      if (cleanUrl === '/api/check-update') {
        async function checkLatestVersion() {
          try {
            const ghRelease: any = await fetchHttpsJson('https://api.github.com/repos/kuangru52/AuraNav/releases/latest')
            if (ghRelease && ghRelease.tag_name) {
              return { success: true, latestVersion: ghRelease.tag_name.replace(/^v/i, ''), source: 'GitHub' }
            }
          } catch {}

          try {
            const cdnData: any = await fetchHttpsJson('https://cdn.jsdelivr.net/gh/kuangru52/AuraNav@main/package.json')
            if (cdnData && cdnData.version) {
              return { success: true, latestVersion: cdnData.version, source: 'GitHub (jsDelivr镜像)' }
            }
          } catch {}

          try {
            const rawData: any = await fetchHttpsJson('https://raw.githubusercontent.com/kuangru52/AuraNav/main/package.json')
            if (rawData && rawData.version) {
              return { success: true, latestVersion: rawData.version, source: 'GitHub Raw' }
            }
          } catch {}

          try {
            const dockerData: any = await fetchHttpsJson('https://hub.docker.com/v2/repositories/kuangru52/auranav/tags?page_size=25')
            if (dockerData && Array.isArray(dockerData.results)) {
              let highestTag = ''
              for (const t of dockerData.results) {
                if (t.name && t.name !== 'latest' && /^\d+\.\d+/.test(t.name)) {
                  if (!highestTag || compareSemver(t.name, highestTag) > 0) {
                    highestTag = t.name
                  }
                }
              }
              if (highestTag) return { success: true, latestVersion: highestTag, source: 'Docker Hub' }
            }
          } catch {}

          return { success: false, error: '无法连接 GitHub 或 Docker Hub 检查更新' }
        }

        checkLatestVersion()
          .then((result) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(result))
          })
          .catch((e: any) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, error: e.message }))
          })
        return
      }

      // API: Login (/api/login)
      if (cleanUrl === '/api/login' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', () => {
          try {
            const { username, password } = JSON.parse(body || '{}')
            const inputUser = (username || '').trim()
            const inputPass = (password || '').trim()

            if (inputUser.toLowerCase() === ADMIN_USER.toLowerCase() && inputPass === ADMIN_PASSWORD) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, user: { username: ADMIN_USER, isAdmin: true } }))
            } else {
              res.statusCode = 401
              res.end(JSON.stringify({ success: false, error: '用户名或密码错误' }))
            }
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // API: Sync Cards (/api/sync)
      if (cleanUrl === '/api/sync') {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              fs.writeFileSync(syncFile, body, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, message: 'sync.json 保存成功' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'GET') {
          try {
            if (fs.existsSync(syncFile)) {
              const data = fs.readFileSync(syncFile, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(data)
            } else {
              fs.writeFileSync(syncFile, JSON.stringify(DEFAULT_CARDS_DATA, null, 2), 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(DEFAULT_CARDS_DATA))
            }
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
          return
        }
      }

      // API: Config Sync (/api/config)
      if (cleanUrl === '/api/config') {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              fs.writeFileSync(configFile, body, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, message: 'config.json 保存成功' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'GET') {
          try {
            if (fs.existsSync(configFile)) {
              const data = fs.readFileSync(configFile, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(data)
            } else {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({}))
            }
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
          return
        }
      }

      // API: Upload Icon or Wallpaper
      if (cleanUrl === '/api/upload' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', () => {
          try {
            const { type, base64 } = JSON.parse(body || '{}')
            if (!base64) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: '缺少图片数据' }))
              return
            }
            const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
            let ext = '.png'
            let buffer: any
            if (matches && matches.length === 3) {
              if (matches[1] === 'image/jpeg') ext = '.jpg'
              else if (matches[1] === 'image/webp') ext = '.webp'
              else if (matches[1] === 'image/gif') ext = '.gif'
              // @ts-ignore
              buffer = Buffer.from(matches[2], 'base64')
            } else {
              // @ts-ignore
              buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
            }

            const targetSubDir = type === 'wallpaper' ? wallpapersDir : iconsDir
            if (!fs.existsSync(targetSubDir)) fs.mkdirSync(targetSubDir, { recursive: true })

            const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
            const targetPath = path.join(targetSubDir, safeName)
            fs.writeFileSync(targetPath, buffer)

            const relativeUrl = `/data/${type === 'wallpaper' ? 'wallpapers' : 'icons'}/${safeName}`
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, url: relativeUrl }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: e.message }))
          }
        })
        return
      }

      // Serve /data/ files
      if (cleanUrl.startsWith('/data/')) {
        const subPath = cleanUrl.replace(/^\/data\//, '')
        const targetFilePath = path.join(dataDir, subPath)
        if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
          const ext = path.extname(targetFilePath)
          const cTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
          }
          res.setHeader('Content-Type', cTypes[ext] || 'application/octet-stream')
          res.end(fs.readFileSync(targetFilePath))
          return
        }
      }

      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), syncPlugin()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/bing-wallpaper': {
        target: 'https://www.bing.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bing-wallpaper/, '/HPImageArchive.aspx'),
      },
    },
  },
})
