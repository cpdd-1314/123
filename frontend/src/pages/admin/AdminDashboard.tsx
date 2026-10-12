import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Flame, LogOut, Pencil, Pin, PinOff, Plus, ShoppingBag, Star, Trash2, Users, Power } from 'lucide-react'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import CountUp from '@/components/reactbits/CountUp'
import PlayerFormDialog from '@/components/admin/PlayerFormDialog'
import { useAdminAuth, useLogout } from '@/hooks/use-admin-auth'
import { useAdminPlayers, usePlayerMutations } from '@/hooks/use-players'
import { getErrorMessage } from '@/lib/api-client'
import type { Player, PlayerInput } from '@/types/players'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { data: me, isLoading: authLoading, isError: authError } = useAdminAuth()
  const logoutMutation = useLogout()
  const { data: players, isLoading } = useAdminPlayers(!!me)
  const mutations = usePlayerMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [deleting, setDeleting] = useState<Player | null>(null)

  // 未登录 → 重定向登录页
  if (!authLoading && (authError || !me)) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    toast.success('已退出登录')
    navigate('/admin/login', { replace: true })
  }

  const handleSubmit = async (input: Partial<PlayerInput>) => {
    try {
      if (editing) {
        await mutations.updatePlayer.mutateAsync({ id: editing.id, input })
        toast.success(`「${input.nickname}」已更新`)
      } else {
        await mutations.createPlayer.mutateAsync(input)
        toast.success(`「${input.nickname}」已上榜`)
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await mutations.deletePlayer.mutateAsync(deleting.id)
      toast.success(`「${deleting.nickname}」已删除`)
      setDeleting(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const totalOrders = (players ?? []).reduce((sum, p) => sum + p.orders, 0)
  const avgRating =
    players && players.length > 0
      ? players.reduce((sum, p) => sum + p.rating, 0) / players.length
      : 0
  const onlineCount = (players ?? []).filter((p) => p.isOnline && p.status === 'active').length

  const submitting =
    mutations.createPlayer.isPending ||
    mutations.updatePlayer.isPending ||
    mutations.deletePlayer.isPending

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* 页头 */}
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据看板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            欢迎回来，{me?.username} —— 在这里维护榜单信息
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="bg-primary text-primary-foreground shadow-[0_0_14px_oklch(0.55_0.28_290/0.4)]"
          >
            <Plus className="size-4" />
            新增陪玩
          </Button>
          <Button variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>
            <LogOut className="size-4" />
            退出
          </Button>
        </div>
      </FadeIn>

      {/* 统计卡片 */}
      <Stagger stagger={0.08} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="陪玩总数" value={players?.length ?? 0} />
        <StatCard icon={Power} label="在线接单" value={onlineCount} />
        <StatCard icon={ShoppingBag} label="累计接单" value={totalOrders} />
        <StatCard icon={Star} label="平均评分" value={avgRating} decimals={1} />
      </Stagger>

      {/* 管理表格 */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">陪玩管理</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            热度积分决定排名；置顶的陪玩将优先展示在榜单最前面
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-14">排名</TableHead>
                  <TableHead>陪玩</TableHead>
                  <TableHead>游戏</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">评分</TableHead>
                  <TableHead className="text-right">接单</TableHead>
                  <TableHead className="text-right">热度</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(players ?? []).map((p, i) => (
                  <TableRow key={p.id} className={p.status === 'offline' ? 'opacity-50' : ''}>
                    <TableCell>
                      <span className="flex size-7 items-center justify-center rounded-md bg-secondary/70 text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img src={p.avatar} alt="" className="size-8 rounded-lg border border-border object-cover" />
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            {p.nickname}
                            {p.isPinned && <Pin className="size-3 fill-primary text-primary" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.isOnline ? '在线' : '离线'} · {p.tags.slice(0, 2).join(' / ') || '无标签'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.game}</TableCell>
                    <TableCell className="text-right text-sm">¥{p.pricePerHour}</TableCell>
                    <TableCell className="text-right text-sm">{p.rating.toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm">{p.orders}</TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-sm font-semibold text-primary">
                        <Flame className="size-3.5" />
                        {p.score.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          p.status === 'active'
                            ? 'border-success/40 bg-success/10 text-success'
                            : 'border-border bg-muted text-muted-foreground'
                        }
                      >
                        {p.status === 'active' ? '已上架' : '已下架'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn
                          title={p.isPinned ? '取消置顶' : '置顶'}
                          onClick={() => mutations.togglePin.mutate(p.id)}
                        >
                          {p.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                        </IconBtn>
                        <IconBtn
                          title={p.status === 'active' ? '下架' : '上架'}
                          onClick={() =>
                            mutations.toggleStatus.mutate({
                              id: p.id,
                              status: p.status === 'active' ? 'offline' : 'active',
                            })
                          }
                        >
                          <Power className="size-4" />
                        </IconBtn>
                        <IconBtn
                          title="编辑"
                          onClick={() => {
                            setEditing(p)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                        </IconBtn>
                        <IconBtn title="删除" danger onClick={() => setDeleting(p)}>
                          <Trash2 className="size-4" />
                        </IconBtn>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(players ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      暂无陪玩数据，点击右上角「新增陪玩」开始
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗（key 变化时重挂载，重置表单状态） */}
      <PlayerFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        player={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.nickname}」？</AlertDialogTitle>
            <AlertDialogDescription>删除后将无法恢复，该陪玩会立即从榜单消失。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  decimals = 0,
}: {
  icon: typeof Users
  label: string
  value: number
  decimals?: number
}) {
  return (
    <FadeIn className="rounded-xl border border-border bg-card px-4 py-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-2 font-[Russo_One,sans-serif] text-2xl text-foreground">
        <CountUp to={value} decimals={decimals} duration={1.4} />
      </p>
      <p className="mt-0.5 text-[11px] tracking-widest text-muted-foreground">{label}</p>
    </FadeIn>
  )
}

function IconBtn({
  title,
  onClick,
  children,
  danger = false,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        'flex size-8 items-center justify-center rounded-lg border border-border bg-background/50 transition-colors duration-200 ' +
        (danger
          ? 'text-muted-foreground hover:border-destructive/60 hover:text-destructive'
          : 'text-muted-foreground hover:border-primary/60 hover:text-primary')
      }
    >
      {children}
    </button>
  )
}
