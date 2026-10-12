import { useEffect, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
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
import { useGames, useUploadAvatar } from '@/hooks/use-players'
import { useUpdateSelf } from '@/hooks/use-player-portal'
import { getErrorMessage } from '@/lib/api-client'
import { GAME_OPTIONS, type Game, type Player } from '@/types/players'

interface Values {
  nickname: string
  avatar: string
  game: string
  tagsText: string
  description: string
  pricePerHour: number
}

/** 陪玩自助修改个人资料 */
export default function PlayerEditDialog({
  open,
  player,
  onClose,
  onSaved,
}: {
  open: boolean
  player: Player
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<Values>({
    nickname: player.nickname,
    avatar: player.avatar,
    game: player.game,
    tagsText: player.tags.join('、'),
    description: player.description,
    pricePerHour: player.pricePerHour,
  })
  const [error, setError] = useState<string | null>(null)
  const uploadAvatar = useUploadAvatar()
  const updateSelf = useUpdateSelf()
  const { data: games } = useGames()
  const gameList: string[] = (games?.length ? games : []).map((g: Game) => g.name)
  const fallbackGames = gameList.length ? gameList : [...GAME_OPTIONS]

  useEffect(() => {
    if (open) {
      setValues({
        nickname: player.nickname,
        avatar: player.avatar,
        game: player.game,
        tagsText: player.tags.join('、'),
        description: player.description,
        pricePerHour: player.pricePerHour,
      })
      setError(null)
    }
  }, [open, player])

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const res = await uploadAvatar.mutateAsync(file)
      set('avatar', res.url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await updateSelf.mutateAsync({
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
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>编辑我的资料</DialogTitle>
          <DialogDescription>修改后点击保存，前台榜单将实时更新。</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pe-nickname">昵称 *</Label>
              <Input
                id="pe-nickname"
                value={values.nickname}
                onChange={(e) => set('nickname', e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe-game">主打游戏 *</Label>
              <select
                value={values.game}
                onChange={(e) => set('game', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {fallbackGames.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>头像</Label>
            <div className="flex items-center gap-3">
              <img
                src={values.avatar || '/avatars/01.svg'}
                alt="头像预览"
                className="size-14 rounded-lg border border-border object-cover"
              />
              <div className="flex-1">
                <Button type="button" variant="outline" size="sm" disabled={uploadAvatar.isPending} onClick={() => document.getElementById('pe-avatar')?.click()}>
                  {uploadAvatar.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  上传图片
                </Button>
                <input
                  id="pe-avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </div>
            <Input
              value={values.avatar}
              onChange={(e) => set('avatar', e.target.value)}
              placeholder="也可直接填写图片地址"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pe-tags">标签（用顿号/逗号分隔，最多6个）</Label>
            <Input
              id="pe-tags"
              value={values.tagsText}
              onChange={(e) => set('tagsText', e.target.value)}
              placeholder="如：技术陪、打野、荣耀王者"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pe-desc">简介</Label>
            <textarea
              id="pe-desc"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pe-price">单价(元/时)</Label>
            <Input
              id="pe-price"
              type="number"
              min={0}
              value={values.pricePerHour}
              onChange={(e) => set('pricePerHour', Number(e.target.value))}
            />
          </div>

          {error && <p className="text-[11px] text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={updateSelf.isPending}>
              取消
            </Button>
            <Button type="submit" disabled={updateSelf.isPending} className="bg-primary text-primary-foreground">
              {updateSelf.isPending ? <><Loader2 className="size-4 animate-spin" />保存中…</> : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
