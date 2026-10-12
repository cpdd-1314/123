import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateOrder, useUpdateOrder, type Order, type OrderPayload } from '@/hooks/use-orders'
import { GAME_OPTIONS } from '@/types/players'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 传入表示编辑，不传表示新建 */
  order?: Order | null
  /** 可指派的陪玩列表 */
  players: Array<{ id: number; nickname: string }>
}

interface FormValues {
  title: string
  game: string
  description: string
  price: number
  duration: number
  customerNote: string
  assignedPlayerId: string
}

const EMPTY: FormValues = {
  title: '',
  game: GAME_OPTIONS[0] ?? '王者荣耀',
  description: '',
  price: 50,
  duration: 1,
  customerNote: '',
  assignedPlayerId: 'none',
}

/** 订单新建 / 编辑弹窗 */
export default function OrderFormDialog({ open, onOpenChange, order, players }: Props) {
  const [values, setValues] = useState<FormValues>(EMPTY)
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const isEdit = Boolean(order)
  const pending = createOrder.isPending || updateOrder.isPending

  useEffect(() => {
    if (!open) return
    if (order) {
      setValues({
        title: order.title,
        game: order.game,
        description: order.description,
        price: order.price,
        duration: order.duration,
        customerNote: order.customerNote,
        assignedPlayerId: order.assignedPlayerId ? String(order.assignedPlayerId) : 'none',
      })
    } else {
      setValues(EMPTY)
    }
  }, [open, order])

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!values.title.trim()) return

    const payload: OrderPayload = {
      title: values.title.trim(),
      game: values.game,
      description: values.description.trim(),
      price: Number(values.price) || 0,
      duration: Number(values.duration) || 1,
      customerNote: values.customerNote.trim(),
      assignedPlayerId: values.assignedPlayerId === 'none' ? null : Number(values.assignedPlayerId),
    }

    try {
      if (isEdit && order) {
        await updateOrder.mutateAsync({ id: order.id, ...payload })
      } else {
        await createOrder.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      // 错误由全局提示处理
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑订单' : '发布新订单'}</DialogTitle>
          <DialogDescription>
            管理员发布订单后，被指定的陪玩（或全部陪玩）可在陪玩中心查看并接单。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="of-title">订单标题</Label>
            <Input
              id="of-title"
              placeholder="例如：王者荣耀 排位上分带飞"
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="of-game">游戏</Label>
              <Select value={values.game} onValueChange={(v) => set('game', v)}>
                <SelectTrigger id="of-game">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-price">单价（元/小时）</Label>
              <Input
                id="of-price"
                type="number"
                min={0}
                value={values.price}
                onChange={(e) => set('price', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="of-duration">时长（小时）</Label>
              <Input
                id="of-duration"
                type="number"
                min={1}
                max={24}
                value={values.duration}
                onChange={(e) => set('duration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-assign">指派陪玩</Label>
              <Select value={values.assignedPlayerId} onValueChange={(v) => set('assignedPlayerId', v)}>
                <SelectTrigger id="of-assign">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定（全部陪玩可接）</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="of-desc">订单说明</Label>
            <textarea
              id="of-desc"
              rows={3}
              placeholder="补充段位、时间、要求等信息"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="of-note">客户备注（仅管理员与接单陪玩可见）</Label>
            <Input
              id="of-note"
              placeholder="例如：客户 ID、联系方式"
              value={values.customerNote}
              onChange={(e) => set('customerNote', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !values.title.trim()}>
            {pending ? '保存中…' : isEdit ? '保存修改' : '发布订单'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
