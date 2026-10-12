import { useState } from 'react'
import { Gamepad2, Loader2, Plus, Trash2 } from 'lucide-react'
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
import { useGameMutations, useGames } from '@/hooks/use-players'
import { getErrorMessage } from '@/lib/api-client'

/** 游戏目录管理：管理员增删游戏，前端下拉与筛选实时同步 */
export default function GamesDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: games, isLoading } = useGames()
  const { createGame, deleteGame } = useGameMutations()
  const [name, setName] = useState('')

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await createGame.mutateAsync(trimmed)
      setName('')
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该游戏？已选择该游戏的陪玩/订单不受影响，仅目录移除。')) return
    try {
      await deleteGame.mutateAsync(id)
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="size-4 text-primary" />
            游戏目录管理
          </DialogTitle>
          <DialogDescription>
            新增或删除游戏，前台的筛选与表单下拉会自动同步。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="输入新游戏名称，如：原神"
            maxLength={50}
            className="flex-1"
          />
          <Button
            onClick={handleAdd}
            disabled={createGame.isPending || !name.trim()}
            size="sm"
          >
            {createGame.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            添加
          </Button>
        </div>

        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>
          ) : (games ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无游戏，添加一个吧</p>
          ) : (
            (games ?? []).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2"
              >
                <span className="text-sm text-foreground">{g.name}</span>
                <button
                  onClick={() => handleDelete(g.id)}
                  disabled={deleteGame.isPending}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                  title="删除游戏"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
