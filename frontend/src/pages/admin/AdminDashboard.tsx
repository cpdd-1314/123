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
import {
  Building2,
  Flame,
  KeyRound,
  LogOut,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Star,
  Trash2,
  UserCheck,
  Users,
  Power,
} from 'lucide-react'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import CountUp from '@/components/reactbits/CountUp'
import PlayerFormDialog from '@/components/admin/PlayerFormDialog'
import AccountDialog from '@/components/admin/AccountDialog'
import ClubSettingsDialog from '@/components/admin/ClubSettingsDialog'
import OrderFormDialog from '@/components/admin/OrderFormDialog'
import { useAdminAuth, useLogout } from '@/hooks/use-admin-auth'
import { useAccountMutations, useAdminPlayers, usePlayerMutations } from '@/hooks/use-players'
import { ORDER_STATUS_LABEL, useAdminOrders, useDeleteOrder, useUpdateOrder, type Order } from '@/hooks/use-orders'
import { getErrorMessage } from '@/lib/api-client'
import type { AdminPlayer, GeneratedAccount, PlayerInput } from '@/types/players'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { data: me, isLoading: authLoading, isError: authError } = useAdminAuth()
  const logoutMutation = useLogout()
  const { data: players, isLoading } = useAdminPlayers(!!me)
  const mutations = usePlayerMutations()
  const accountMutations = useAccountMutations()

  // 订单管理
  const { data: orders } = useAdminOrders()
  const updateOrder = useUpdateOrder()
  const deleteOrder = useDeleteOrder()
  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPlayer | null>(null)
  const [deleting, setDeleting] = useState<AdminPlayer | null>(null)
  const [accountPlayer, setAccountPlayer] = useState<AdminPlayer | null>(null)
  const [generated, setGenerated] = useState<GeneratedAccount | null>(null)
  const [clubOpen, setClubOpen] = useState(false)

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

  const handleGenerateAccount = async (username?: string) => {
    if (!accountPlayer) return
    try {
      const result = await accountMutations.generateAccount.mutateAsync({
        id: accountPlayer.id,
        username,
      })
      setGenerated(result)
      toast.success(`账号已生成：${result.username}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleRevokeAccount = async () => {
    if (!accountPlayer) return
    try {
      await accountMutations.revokeAccount.mutateAsync(accountPlayer.id)
      toast.success('账号已注销')
      setAccountPlayer(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const list = players ?? []
  const totalOrders = list.reduce((sum, p) => sum + p.orders, 0)
  const totalReviews = list.reduce((sum, p) => sum + p.reviewCount, 0)
  const activeCount = list.filter((p) => p.status === 'active').length
  const accountCount = list.filter((p) => p.hasAccount).length

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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setClubOpen(true)}>
            <Building2 className="size-4" />
            俱乐部设置
          </Button>
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
        <StatCard icon={Users} label="陪玩总数" value={list.length} />
        <StatCard icon={UserCheck} label="已上架" value={activeCount} />
        <StatCard icon={KeyRound} label="已建账号" value={accountCount} />
        <StatCard icon={MessageSquare} label="累计评价" value={totalReviews} />
      </Stagger>

      <Stagger stagger={0.08} className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Flame} label="总人气" value={totalOrders} />
      </Stagger>

      {/* 管理表格 */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">陪玩管理</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            热度积分决定排名；置顶的陪玩将优先展示在榜单最前面。可为每位陪玩生成专属账号。
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
                  <TableHead className="text-right">星级</TableHead>
                  <TableHead className="text-right">人气</TableHead>
                  <TableHead className="text-right">热度</TableHead>
                  <TableHead className="text-center">账号</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p, i) => (
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
                            {p.tags.slice(0, 2).join(' / ') || '无标签'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.game}</TableCell>
                    <TableCell className="text-right text-sm">¥{p.pricePerHour}</TableCell>
                    <TableCell className="text-right text-sm">
                      {p.reviewCount > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <Star className="size-3.5 fill-warning text-warning" />
                          {p.reviewAverage.toFixed(1)}
                          <span className="text-[11px] text-muted-foreground">({p.reviewCount})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.orders}</TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-sm font-semibold text-primary">
                        <Flame className="size-3.5" />
                        {p.score.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => {
                          setGenerated(null)
                          setAccountPlayer(p)
                        }}
                        className={
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors ' +
                          (p.hasAccount
                            ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
                            : 'border-border bg-muted text-muted-foreground hover:border-primary/50 hover:text-primary')
                        }
                        title={p.hasAccount ? `账号：${p.accountUsername}` : '点击生成账号'}
                      >
                        <KeyRound className="size-3" />
                        {p.hasAccount ? p.accountUsername : '未建'}
                      </button>
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
                          title="账号"
                          onClick={() => {
                            setGenerated(null)
                            setAccountPlayer(p)
                          }}
                        >
                          <KeyRound className="size-4" />
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
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                      暂无陪玩数据，点击右上角「新增陪玩」开始
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 订单管理 */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">订单管理</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              发布订单后可指定陪玩接单；不指定则全部陪玩可见。陪玩在「陪玩中心」接单，完成后自动累加人气。
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingOrder(null)
              setOrderFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            发布订单
          </Button>
        </div>

        {(orders ?? []).length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            暂无订单，点击「发布订单」创建第一条
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>订单</TableHead>
                  <TableHead>游戏</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>指派 / 接单</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate text-sm font-medium text-foreground">{o.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {o.duration} 小时
                        {o.customerNote ? ` · ${o.customerNote}` : ''}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.game}</TableCell>
                    <TableCell className="text-right text-sm">¥{o.price}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          o.status === 'open'
                            ? 'border-primary/50 text-primary'
                            : o.status === 'taken'
                              ? 'border-amber-500/50 text-amber-500'
                              : o.status === 'done'
                                ? 'border-emerald-500/50 text-emerald-500'
                                : 'border-border text-muted-foreground'
                        }
                      >
                        {ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.assignedPlayerName ? (
                        <span className="text-primary">指派：{o.assignedPlayerName}</span>
                      ) : (
                        <span>公开订单</span>
                      )}
                      {o.takenByName && <span className="ml-2">· 接单：{o.takenByName}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === 'taken' && (
                          <IconBtn
                            title="标记完成"
                            onClick={() => updateOrder.mutate({ id: o.id, status: 'done' })}
                          >
                            <UserCheck className="size-4" />
                          </IconBtn>
                        )}
                        {o.status === 'open' && (
                          <IconBtn
                            title="取消订单"
                            onClick={() => updateOrder.mutate({ id: o.id, status: 'canceled' })}
                          >
                            <Power className="size-4" />
                          </IconBtn>
                        )}
                        <IconBtn
                          title="编辑"
                          onClick={() => {
                            setEditingOrder(o)
                            setOrderFormOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                        </IconBtn>
                        <IconBtn title="删除" danger onClick={() => setDeletingOrder(o)}>
                          <Trash2 className="size-4" />
                        </IconBtn>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* 账号管理 */}
      <AccountDialog
        player={accountPlayer}
        generated={generated}
        onClose={() => {
          setAccountPlayer(null)
          setGenerated(null)
        }}
        onGenerate={handleGenerateAccount}
        onRevoke={handleRevokeAccount}
        generating={accountMutations.generateAccount.isPending}
        revoking={accountMutations.revokeAccount.isPending}
      />

      {/* 俱乐部设置 */}
      <ClubSettingsDialog open={clubOpen} onClose={() => setClubOpen(false)} />

      <OrderFormDialog
        open={orderFormOpen}
        onOpenChange={setOrderFormOpen}
        order={editingOrder}
        players={list.map((p) => ({ id: p.id, nickname: p.nickname }))}
      />

      <AlertDialog open={!!deletingOrder} onOpenChange={(o) => !o && setDeletingOrder(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除订单「{deletingOrder?.title}」？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，接单记录也会一并消失。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deletingOrder) {
                  deleteOrder.mutate(deletingOrder.id, {
                    onSuccess: () => toast.success('订单已删除'),
                    onError: (err) => toast.error(getErrorMessage(err)),
                  })
                }
                setDeletingOrder(null)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
