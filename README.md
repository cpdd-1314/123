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

**实时同步（SSE）**
- 后台任一变更（增 / 改 / 删 / 上下架 / 置顶）通过 `GET /api/events` 推送 `players-changed` 事件
- 前台 `EventSource` 订阅后自动失效 TanStack Query 缓存，榜单 / 统计 / 详情即时刷新，无需手动刷新页面
- 导航栏 LIVE 指示灯显示连接状态；25s 心跳保活，断线指数退避自动重连

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

## 部署

前后端**一体化部署**：Express 在生产环境同时托管前端构建产物、API 与 SSE，单服务单端口即可访问完整功能（含实时同步）。

```bash
# Docker 一行运行（需自备 PostgreSQL）
docker build -t peiwan-rank . && docker run -p 3000:3000 -e DATABASE_URL="..." peiwan-rank
```

Render / Railway / 自建服务器等完整步骤见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。
> 注意：GitHub Pages 仅支持静态托管，无法运行后端与 SSE，本应用不适用。

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
| GET | `/api/events` | SSE 实时推送（`players-changed` 事件 + 心跳） |

详细产品设计见 [`docs/product/features.md`](docs/product/features.md)。

## 目录结构

```
backend/src/
  modules/players.ts   # 前台榜单 + 统计 + 详情
  modules/admin.ts     # 登录 + 管理端 CRUD（变更后广播事件）
  modules/events.ts    # SSE 实时推送
  modules/system.ts    # 健康检查
  db/                  # 连接池 + schema（含种子数据）
  middleware/auth.ts   # Cookie JWT 鉴权
frontend/src/
  pages/Index.tsx            # 排行榜首页
  pages/PlayerDetail.tsx     # 陪玩详情
  pages/admin/               # 登录 + 数据看板
  components/ranking/        # 领奖台 / 卡片 / 筛选栏 / 统计
  components/reactbits/      # CountUp 数字滚动
  hooks/use-realtime.ts      # EventSource 订阅 + 缓存失效
```
