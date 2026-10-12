import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GAME_OPTIONS, type Player, type PlayerInput } from '@/types/players'

interface PlayerFormValues {
  nickname: string
  avatar: string
  game: string
  tagsText: string
  description: string
  pricePerHour: number
  rating: number
  orders: number
  score: number
  isOnline: boolean
  status: 'active' | 'offline'
  isPinned: boolean
}

const emptyValues: PlayerFormValues = {
  nickname: '',
  avatar: '/avatars/01.svg',
  game: GAME_OPTIONS[0],
  tagsText: '',
  description: '',
  pricePerHour: 30,
  rating: 5,
  orders: 0,
  score: 0,
  isOnline: true,
  status: 'active',
  isPinned: false,
}

function toFormValues(player?: Player): PlayerFormValues {
  if (!player) return emptyValues
  return {
    nickname: player.nickname,
    avatar: player.avatar,
    game: player.game,
    tagsText: player.tags.join('、'),
    description: player.description,
    pricePerHour: player.pricePerHour,
    rating: player.rating,
    orders: player.orders,
    score: player.score,
    isOnline: player.isOnline,
    status: player.status,
    isPinned: player.isPinned,
  }
}

/** 新增 / 编辑陪玩弹窗表单 */
export default function PlayerFormDialog({
  open,
  player,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean
  player?: Player | null
  onClose: () => void
  onSubmit: (input: Partial<PlayerInput>) => Promise<unknown>
  submitting: boolean
}) {
  // 表单状态由初始 prop 决定；父组件通过 key 重挂载实现不同陪玩间的重置
  const [values, setValues] = useState<PlayerFormValues>(() => toFormValues(player ?? undefined))
  const isEdit = !!player

  const set = <K extends keyof PlayerFormValues>(key: K, value: PlayerFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const input: Partial<PlayerInput> = {
      nickname: values.nickname.trim(),
      avatar: values.avatar.trim(),
      game: values.game,
      tags: values.tagsText
        .split(/[、,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6),
      description: values.description.trim(),
      pricePerHour: Number(values.pricePerHour),
      rating: Number(values.rating),
      orders: Number(values.orders),
      score: Number(values.score),
      isOnline: values.isOnline,
      status: values.status,
      isPinned: values.isPinned,
    }
    await onSubmit(input)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>{isEdit ? `编辑「${player?.nickname}」` : '新增陪玩'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改资料后点击保存，榜单将实时更新。' : '填写陪玩资料，保存后立即上榜。'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-nickname">昵称 *</Label>
              <Input
                id="pf-nickname"
                value={values.nickname}
                onChange={(e) => set('nickname', e.target.value)}
                placeholder="如：夜刃"
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-game">主打游戏 *</Label>
              <Select value={values.game} onValueChange={(v) => set('game', v)}>
                <SelectTrigger id="pf-game">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-avatar">头像地址</Label>
            <div className="flex items-center gap-3">
              <img src={values.avatar || '/avatars/01.svg'} alt="头像预览" className="size-11 rounded-lg border border-border object-cover" />
              <Input
                id="pf-avatar"
                value={values.avatar}
                onChange={(e) => set('avatar', e.target.value)}
                placeholder="/avatars/01.svg 或图片URL"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-tags">标签（用顿号/逗号分隔，最多6个）</Label>
            <Input
              id="pf-tags"
              value={values.tagsText}
              onChange={(e) => set('tagsText', e.target.value)}
              placeholder="如：技术陪、打野、荣耀王者"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-desc">简介</Label>
            <textarea
              id="pf-desc"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="一句话介绍自己..."
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="pf-price">单价(元/时)</Label>
              <Input
                id="pf-price"
                type="number"
                min={0}
                value={values.pricePerHour}
                onChange={(e) => set('pricePerHour', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-rating">评分(0-5)</Label>
              <Input
                id="pf-rating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={values.rating}
                onChange={(e) => set('rating', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-orders">接单数</Label>
              <Input
                id="pf-orders"
                type="number"
                min={0}
                value={values.orders}
                onChange={(e) => set('orders', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-score">热度积分</Label>
              <Input
                id="pf-score"
                type="number"
                value={values.score}
                onChange={(e) => set('score', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Switch id="pf-online" checked={values.isOnline} onCheckedChange={(v) => set('isOnline', v)} />
              <Label htmlFor="pf-online" className="text-xs">在线接单</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pf-pinned" checked={values.isPinned} onCheckedChange={(v) => set('isPinned', v)} />
              <Label htmlFor="pf-pinned" className="text-xs">置顶推荐</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pf-status"
                checked={values.status === 'active'}
                onCheckedChange={(v) => set('status', v ? 'active' : 'offline')}
              />
              <Label htmlFor="pf-status" className="text-xs">上架中</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting ? <><Loader2 className="size-4 animate-spin" />保存中...</> : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
