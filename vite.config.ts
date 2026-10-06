import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-ignore
import fs from 'fs'
// @ts-ignore
import path from 'path'
// @ts-ignore
import https from 'https'

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

      // API: Check Docker Hub Updates
      if (cleanUrl === '/api/check-update') {
        const options = {
          hostname: 'hub.docker.com',
          path: '/v2/repositories/kuangru52/auranav/tags?page_size=25',
          headers: { 'User-Agent': 'AuraNav-Server' },
          timeout: 8000,
        }

        const reqTag = https.get(options, (tagRes: any) => {
          let data = ''
          tagRes.on('data', (chunk: any) => { data += chunk })
          tagRes.on('end', () => {
            try {
              const json = JSON.parse(data || '{}')
              if (json && Array.isArray(json.results)) {
                let highestTag = ''
                for (const t of json.results) {
                  if (t.name && t.name !== 'latest' && /^\d+\.\d+/.test(t.name)) {
                    if (!highestTag || compareSemver(t.name, highestTag) > 0) {
                      highestTag = t.name
                    }
                  }
                }
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ success: true, latestVersion: highestTag || null }))
                return
              }
            } catch {}
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, error: '无法解析 Docker Hub 数据' }))
          })
        })

        reqTag.on('error', (e: any) => {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ success: false, error: e.message }))
        })
        reqTag.on('timeout', () => {
          reqTag.destroy()
          res.statusCode = 504
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ success: false, error: '连接 Docker Hub 超时' }))
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
