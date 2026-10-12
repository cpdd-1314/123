import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LockKeyhole, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuth, useLogin } from '@/hooks/use-admin-auth'
import { getErrorMessage } from '@/lib/api-client'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { data: me } = useAdminAuth()
  const loginMutation = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // 已登录则直接进入后台
  useEffect(() => {
    if (me) navigate('/admin', { replace: true })
  }, [me, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginMutation.mutateAsync({ username, password })
      toast.success('登录成功，欢迎回来')
      navigate('/admin', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 size-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-[0_0_40px_oklch(0.55_0.28_290/0.15)]"
      >
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="size-6 text-primary" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">后台管理登录</h1>
          <p className="mt-1 text-xs text-muted-foreground">𝓮𝓵𝓮𝓿𝓮𝓷十一愿club · 数据维护中心</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs text-muted-foreground">账号</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入管理员账号"
                autoComplete="username"
                className="pl-8"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-muted-foreground">密码</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="pl-8"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary font-semibold text-primary-foreground shadow-[0_0_16px_oklch(0.55_0.28_290/0.5)]"
          >
            {loginMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" />登录中...</>
            ) : (
              '登 录'
            )}
          </Button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          默认账号 admin / admin123<br />可在 backend/.env 中修改 ADMIN_USERNAME / ADMIN_PASSWORD
        </p>
      </form>
    </div>
  )
}
