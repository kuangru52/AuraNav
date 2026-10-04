import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-ignore
import fs from 'fs'
// @ts-ignore
import path from 'path'

const syncPlugin = () => ({
  name: 'sync-api-plugin',
  configureServer(server: any) {
    const dataDir = path.resolve('./data')
    const usersFilePath = fs.existsSync(dataDir)
      ? path.join(dataDir, 'users.json')
      : path.resolve('./users.json')

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

    const getOrdinaryUsers = () => {
      try {
        if (fs.existsSync(usersFilePath)) {
          return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8')) || []
        }
      } catch {}
      return []
    }

    const saveOrdinaryUsers = (users: any) => {
      try {
        const dir = path.dirname(usersFilePath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8')
      } catch {}
    }

    const getUserSyncFilePath = (username: string) => {
      const safeName = (username || 'admin').replace(/[^a-zA-Z0-9_-]/g, '_')
      if (fs.existsSync(dataDir)) {
        return path.join(dataDir, `sync-${safeName}.json`)
      }
      return path.resolve(`./sync-${safeName}.json`)
    }

    server.middlewares.use((req: any, res: any, next: any) => {
      const rawUrl = req.url || '/'
      const cleanUrl = rawUrl.split('?')[0]
      const queryString = rawUrl.includes('?') ? rawUrl.split('?')[1] : ''

      // API: Users Management (/api/users)
      if (cleanUrl === '/api/users') {
        if (req.method === 'GET') {
          const users = getOrdinaryUsers().map((u: any) => ({ username: u.username, role: 'user' }))
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ adminUser: ADMIN_USER, ordinaryUsers: users }))
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const { username, password } = JSON.parse(body || '{}')
              if (!username || !password) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: '用户名和密码不能为空' }))
                return
              }
              if (username.trim().toLowerCase() === ADMIN_USER.toLowerCase()) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: '不能使用管理员用户名' }))
                return
              }
              const currentList = getOrdinaryUsers()
              if (currentList.some((u: any) => u.username.toLowerCase() === username.trim().toLowerCase())) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: '用户已存在' }))
                return
              }
              currentList.push({ username: username.trim(), password: password.trim() })
              saveOrdinaryUsers(currentList)
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, message: '普通用户创建成功' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'DELETE') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const { username } = JSON.parse(body || '{}')
              if (!username) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: '需要提供要删除的用户名' }))
                return
              }
              let currentList = getOrdinaryUsers()
              currentList = currentList.filter((u: any) => u.username.toLowerCase() !== username.trim().toLowerCase())
              saveOrdinaryUsers(currentList)

              const userFile = getUserSyncFilePath(username)
              if (fs.existsSync(userFile)) {
                try { fs.unlinkSync(userFile) } catch {}
              }

              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, message: '用户已删除' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }
      }

      // API: Login (/api/login)
      if (cleanUrl === '/api/login') {
        if (req.method === 'POST') {
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
                return
              }

              const ordinary = getOrdinaryUsers()
              const matched = ordinary.find((u: any) => u.username.toLowerCase() === inputUser.toLowerCase() && u.password === inputPass)
              if (matched) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ success: true, user: { username: matched.username, isAdmin: false } }))
                return
              }

              res.statusCode = 401
              res.end(JSON.stringify({ success: false, error: '用户名或密码错误' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }
      }

      // API: Sync (/api/sync)
      if (cleanUrl === '/api/sync') {
        let userQuery = ADMIN_USER
        if (queryString) {
          const match = queryString.match(/username=([^&]+)/)
          if (match && match[1]) {
            userQuery = decodeURIComponent(match[1])
          }
        }

        const targetFile = getUserSyncFilePath(userQuery)

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const targetDir = path.dirname(targetFile)
              if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
              fs.writeFileSync(targetFile, body, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: true, message: 'Sync data saved on server' }))
            } catch (e: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: e.message }))
            }
          })
          return
        }

        if (req.method === 'GET') {
          try {
            if (fs.existsSync(targetFile)) {
              const data = fs.readFileSync(targetFile, 'utf-8')
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
