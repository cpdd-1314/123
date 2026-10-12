# 巅峰陪玩榜 · Peiwan Rank

电竞陪玩排行榜全栈应用：前台榜单展示 + 后台信息维护。

## 功能

**前台（`/`）**
- TOP3 荣耀领奖台（金/银/铜台阶 + 皇冠）
- 实时统计：在榜人数、在线接单、累计接单、平均评分（数字滚动动画）
- 游戏筛选（王者荣耀 / 英雄联盟 / 和平精英 / 无畏契约 / 永劫无间）
- 关键词搜索（昵称 / 标签 / 简介）+ 四维排序（热度 / 评分 / 接单数 / 单价，升降序）
- 陪玩详情页（数据面板、技能标签、简介、下单入口）

**后台（`/admin`）**
- 账号密码登录（JWT 存 httpOnly Cookie，SameSite=Lax + Origin 校验防 CSRF）
- 数据看板：陪玩总数 / 在线数 / 累计接单 / 平均评分
- 陪玩管理表格：新增、编辑、删除、上架/下架、置顶推荐
- 热度积分可直接调整，实时影响榜单排名

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite + Tailwind CSS v4 + shadcn/ui + TanStack Query + framer-motion |
| 后端 | Express + TypeScript + Zod + Pino（结构化日志） |
| 数据库 | PostgreSQL（`pg` 连接池，启动时幂等建表 + 种子数据） |
| 设计 | 电竞合成波暗色主题（霓虹紫 #7C3AED / 青 #22D3EE，Chakra Petch + Russo One） |

## 运行

```bash
# 前端（已由环境代理至 :55221）
cd frontend && pnpm dev

# 后端（:3000，需 PostgreSQL）
cd backend && pnpm dev
```

数据库连接见 `backend/.env` 的 `DATABASE_URL`（默认本地 docker postgres / genie 库）。
服务启动时自动执行建表与种子数据（12 位陪玩），重复执行无副作用。

## 后台账号

默认 `admin / admin123`，可在 `backend/.env` 修改：

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=peiwan-admin-secret-change-me
```

## API 一览

| Method | Route | 说明 |
|---|---|---|
| GET | `/api/players` | 榜单（`game`/`keyword`/`sort`/`order` 参数） |
| GET | `/api/players/:id` | 陪玩详情 |
| GET | `/api/stats` | 公开统计 |
| POST | `/api/admin/login` | 登录（Set-Cookie） |
| POST | `/api/admin/logout` | 退出 |
| GET | `/api/admin/me` | 登录态校验 |
| GET/POST | `/api/admin/players` | 管理端列表 / 新增 |
| PUT/DELETE | `/api/admin/players/:id` | 编辑 / 删除 |
| PATCH | `/api/admin/players/:id/status` | 上架 / 下架 |
| PATCH | `/api/admin/players/:id/pin` | 置顶 / 取消 |

详细产品设计见 [`docs/product/features.md`](docs/product/features.md)。

## 目录结构

```
backend/src/
  modules/players.ts   # 前台榜单 + 统计 + 详情
  modules/admin.ts     # 登录 + 管理端 CRUD
  modules/system.ts    # 健康检查
  db/                  # 连接池 + schema（含种子数据）
  middleware/auth.ts   # Cookie JWT 鉴权
frontend/src/
  pages/Index.tsx            # 排行榜首页
  pages/PlayerDetail.tsx     # 陪玩详情
  pages/admin/               # 登录 + 数据看板
  components/ranking/        # 领奖台 / 卡片 / 筛选栏 / 统计
  components/reactbits/      # CountUp 数字滚动
```
