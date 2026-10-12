import { Check, Copy, KeyRound, RotateCcw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminPlayer, GeneratedAccount } from '@/types/players'

/**
 * 陪玩账号生成弹窗
 * - 未创建：输入账号名（留空自动生成）→ 创建
 * - 已创建：展示账号，可重置密码 / 注销
 * - 生成结果：一次性展示密码（关闭后无法再次查看）
 */
export default function AccountDialog({
  player,
  generated,
  onClose,
  onGenerate,
  onRevoke,
  generating,
  revoking,
}: {
  player: AdminPlayer | null
  generated: GeneratedAccount | null
  onClose: () => void
  onGenerate: (username?: string) => void
  onRevoke: () => void
  generating: boolean
  revoking: boolean
}) {
  const [username, setUsername] = useState('')
  const [copied, setCopied] = useState(false)

  const copyAll = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(
      `账号：${generated.username}\n密码：${generated.password}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Dialog open={!!player} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            陪玩账号 · {player?.nickname}
          </DialogTitle>
          <DialogDescription>
            账号用于陪玩登录查看自己的数据与收到的评价。
          </DialogDescription>
        </DialogHeader>

        {generated ? (
          // 生成结果（密码仅此一次可见）
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning">
              <ShieldAlert className="mr-1 inline size-3.5" />
              密码仅显示这一次，请立即复制并转交给该陪玩。
            </div>
            <div className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">登录账号</Label>
                <Input readOnly value={generated.username} className="font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">登录密码</Label>
                <Input readOnly value={generated.password} className="font-mono text-sm" />
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={copyAll}>
              {copied ? <><Check className="mr-1.5 size-4 text-success" />已复制</> : <><Copy className="mr-1.5 size-4" />复制账号密码</>}
            </Button>
          </div>
        ) : player?.hasAccount ? (
          // 已有账号
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">当前账号</Label>
              <Input readOnly value={player.accountUsername ?? ''} className="font-mono text-sm" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              出于安全考虑，密码不可查看。如忘记密码可重置（旧密码立即失效）。
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={generating}
                onClick={() => onGenerate(player.accountUsername ?? undefined)}
              >
                <RotateCcw className="mr-1.5 size-4" />
                重置密码
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:border-destructive/60 hover:text-destructive"
                disabled={revoking}
                onClick={onRevoke}
              >
                注销账号
              </Button>
            </div>
          </div>
        ) : (
          // 未创建
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-username">账号名（可留空自动生成）</Label>
              <Input
                id="acc-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`留空则为 peiwan${player?.id ?? ''}`}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">3-30 位字母、数字或下划线</p>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground"
              disabled={generating}
              onClick={() => onGenerate(username.trim() || undefined)}
            >
              <KeyRound className="mr-1.5 size-4" />
              {generating ? '生成中…' : '生成账号'}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
