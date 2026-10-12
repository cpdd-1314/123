import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, Loader2, LockKeyhole, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlayerLogin } from '@/hooks/use-player-portal'
import { getErrorMessage } from '@/lib/api-client'

/** 陪玩账号登录页 */
export default function PlayerLogin() {
  const navigate = useNavigate()
  const loginMutation = usePlayerLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginMutation.mutateAsync({ username, password })
      toast.success('登录成功')
      navigate('/player-center', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 size-80 -translate-x-1/2 rounded-full bg-info/20 blur-[120px]" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-[0_0_40px_oklch(0.55_0.28_290/0.15)]"
      >
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-info/15">
            <Gamepad2 className="size-6 text-info" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">陪玩账号登录</h1>
          <p className="mt-1 text-xs text-muted-foreground">查看你的资料、热度与收到的评价</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-username" className="text-xs text-muted-foreground">账号</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="p-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="由俱乐部为你生成"
                autoComplete="username"
                className="pl-8"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-password" className="text-xs text-muted-foreground">密码</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="p-password"
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
          还没有账号？请联系俱乐部管理员为你生成
        </p>
      </form>
    </div>
  )
}
