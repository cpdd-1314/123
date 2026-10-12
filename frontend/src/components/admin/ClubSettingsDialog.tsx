import { useRef, useState } from 'react'
import { Building2, Loader2, Upload } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useClub, useUpdateClub } from '@/hooks/use-club'
import { useUploadAvatar } from '@/hooks/use-players'
import { getErrorMessage } from '@/lib/api-client'
import type { Club } from '@/types/players'

/** 俱乐部资料设置弹窗 */
export default function ClubSettingsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: club, isLoading } = useClub()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            俱乐部资料
          </DialogTitle>
          <DialogDescription>这些信息会展示在排行榜首页，并接受访客星级评价。</DialogDescription>
        </DialogHeader>

        {isLoading || !club ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ClubForm key={club.updatedAt} club={club} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ClubForm({ club, onClose }: { club: Club; onClose: () => void }) {
  const updateClub = useUpdateClub()
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState({
    name: club.name,
    slogan: club.slogan,
    description: club.description,
    avatar: club.avatar,
  })
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const result = await uploadAvatar.mutateAsync(file)
      set('avatar', result.url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await updateClub.mutateAsync(values)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="club-name">俱乐部名称 *</Label>
        <Input
          id="club-name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="club-slogan">标语</Label>
        <Input
          id="club-slogan"
          value={values.slogan}
          onChange={(e) => set('slogan', e.target.value)}
          placeholder="如：实力为尊 · 服务至上"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label>俱乐部头像</Label>
        <div className="flex items-center gap-3">
          {values.avatar ? (
            <img src={values.avatar} alt="预览" className="size-14 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40">
              <Building2 className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadAvatar.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadAvatar.isPending ? (
                <><Loader2 className="mr-1.5 size-3.5 animate-spin" />上传中…</>
              ) : (
                <><Upload className="mr-1.5 size-3.5" />上传图片</>
              )}
            </Button>
            <Input
              value={values.avatar}
              onChange={(e) => set('avatar', e.target.value)}
              placeholder="或填写图片地址"
              className="text-xs"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="club-desc">简介</Label>
        <textarea
          id="club-desc"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>取消</Button>
        <Button type="submit" disabled={updateClub.isPending} className="bg-primary text-primary-foreground">
          {updateClub.isPending ? <><Loader2 className="size-4 animate-spin" />保存中…</> : '保存'}
        </Button>
      </DialogFooter>
    </form>
  )
}
