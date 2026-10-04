import React, { useState } from 'react'
import type { Credentials } from '../types'
import { LogoIcon } from './LogoIcon'

type LoginModalProps = {
  credentials: Credentials
  onLoginSuccess: (user: { username: string; isAdmin: boolean }) => void
}

export function LoginModal({ credentials, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      })
      const data = await response.json()
      if (response.ok && data.success && data.user) {
        localStorage.setItem('liquid-nav-auth', 'true')
        localStorage.setItem('liquid-nav-current-user', JSON.stringify(data.user))
        onLoginSuccess(data.user)
        return
      }
      if (data.error) {
        setError(data.error)
        setIsLoading(false)
        return
      }
    } catch {
      // Fallback client check if offline
      if (username.trim() === credentials.username && password.trim() === credentials.password) {
        const user = { username: credentials.username, isAdmin: true }
        localStorage.setItem('liquid-nav-auth', 'true')
        localStorage.setItem('liquid-nav-current-user', JSON.stringify(user))
        onLoginSuccess(user)
        return
      }
      setError('用户名或密码错误')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-backdrop">
      <div className="login-card" style={{ padding: '32px', width: 'min(400px, calc(100vw - 32px))', borderRadius: '24px', background: 'rgba(13, 20, 34, 0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-mark" style={{ width: '56px', height: '56px', margin: '0 auto 12px', display: 'grid', placeItems: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.94)' }}>
            <LogoIcon />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc' }}>栖屿 · AuraNav</h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(226, 232, 240, 0.65)', fontSize: '0.85rem' }}>请输入账号和密码以进入主页</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }} autoComplete="off">
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.8)' }}>用户名</span>
            <input
              type="text"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              style={{ height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.4)', color: '#fff', outline: 'none' }}
              required
            />
          </label>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.8)' }}>密码</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                style={{ width: '100%', height: '44px', padding: '0 44px 0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.4)', color: '#fff', outline: 'none' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? '隐藏密码' : '显示密码'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  width: '30px',
                  height: '30px',
                  padding: 0,
                  zIndex: 5,
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.4 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
          </label>
          {error && <div style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>}
          <button type="submit" disabled={isLoading} className="action-button primary" style={{ height: '46px', marginTop: '8px', fontSize: '1rem', fontWeight: 600, width: '100%' }}>
            {isLoading ? '登录中…' : '登录主页'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.45)' }}>
          管理员账号由环境变量 <code style={{ color: '#38bdf8' }}>ADMIN_USER / ADMIN_PASSWORD</code> 设定
        </div>
      </div>
    </div>
  )
}
