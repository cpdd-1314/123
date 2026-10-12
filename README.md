# 巅峰陪玩榜 · Peiwan Rank

电竞陪玩俱乐部排行榜全栈应用：前台榜单展示 + 访客星级评价 + 后台信息维护 + 陪玩自助查看。

## 功能

**前台（`/`）**
- TOP3 荣耀领奖台（金/银/铜台阶 + 皇冠）
- 实时统计：在榜陪玩、总人气、平均星级、累计评价（数字滚动动画）
- 俱乐部名片 + 访客星级评价（1-5 星，可附评论）
- 游戏筛选（王者荣耀 / 英雄联盟 / 和平精英 / 无畏契约 / 永劫无间）
- 关键词搜索（昵称 / 标签 / 简介）+ 四维排序（热度 / 评分 / 人气 / 单价，升降序）
- 陪玩详情页：数据面板、技能标签、简介、星级汇总与评价列表

**星级评价**
- 每位访客可为**每位陪玩**和**俱乐部**各评一次（IP + UA 指纹去重，服务端唯一索引兜底）
- 展示平均星数、评价总数、1-5 星分布条与最新评论

**后台（`/admin`）**
- 账号密码登录（JWT 存 httpOnly Cookie，SameSite=Lax + Origin 校验防 CSRF）
- 数据看板：陪玩总数 / 已上架 / 已建账号 / 累计评价 / 总人气
- 陪玩管理：新增、编辑、删除、上架/下架、置顶推荐、调整热度与星级
- **头像上传**：直接选本地图片（≤3MB），二进制存库，云平台重置磁盘也不丢图
- **陪玩账号**：一键为每位陪玩生成账号密码，可重置/注销
- **俱乐部设置**：修改名称、标语、简介、头像

**陪玩中心（`/player-center`）**
- 陪玩用自己的账号登录，查看个人资料、热度积分、综合星级与收到的全部评价

**实时同步（SSE）**
- 后台任一变更（增 / 改 / 删 / 上下架 / 置顶 / 俱乐部设置）通过 `GET /api/events` 推送事件
- 前台 `EventSource` 订阅后自动失效 TanStack Query 缓存，榜单 / 统计 / 详情 / 评价即时刷新
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
| GET | `/api/players/:id/ratings` | 陪玩评价汇总 + 列表 + 当前访客是否已评 |
| POST | `/api/players/:id/ratings` | 提交陪玩星级评价（每人一次） |
| GET | `/api/stats` | 公开统计 |
| GET | `/api/club` | 俱乐部信息 + 评分汇总 |
| GET | `/api/club/ratings` | 俱乐部评价列表 |
| POST | `/api/club/ratings` | 提交俱乐部星级评价（每人一次） |
| GET | `/api/media/:id` | 读取已上传的图片 |
| POST | `/api/player/login` | 陪玩账号登录 |
| POST | `/api/player/logout` | 陪玩退出 |
| GET | `/api/player/me` | 陪玩查看自己的资料与收到的评价 |
| POST | `/api/admin/login` | 管理员登录（Set-Cookie） |
| POST | `/api/admin/logout` | 退出 |
| GET | `/api/admin/me` | 登录态校验 |
| GET/POST | `/api/admin/players` | 管理端列表（含账号信息）/ 新增 |
| PUT/DELETE | `/api/admin/players/:id` | 编辑 / 删除 |
| PATCH | `/api/admin/players/:id/status` | 上架 / 下架 |
| PATCH | `/api/admin/players/:id/pin` | 置顶 / 取消 |
| POST | `/api/admin/players/:id/account` | 生成 / 重置陪玩账号（密码仅返回一次） |
| DELETE | `/api/admin/players/:id/account` | 注销陪玩账号 |
| POST | `/api/admin/media` | 上传图片（头像，≤3MB） |
| PUT | `/api/admin/club` | 修改俱乐部信息 |
| GET | `/api/events` | SSE 实时推送（`players-changed` / `stats-changed` + 心跳） |

详细产品设计见 [`docs/product/features.md`](docs/product/features.md)。

## 目录结构

```
backend/src/
  modules/players.ts       # 前台榜单 + 统计 + 详情 + 陪玩评价
  modules/admin.ts         # 登录 + CRUD + 账号管理（变更后广播事件）
  modules/club.ts          # 俱乐部信息与评价
  modules/ratings.ts       # 评价写入/汇总 + 指纹去重
  modules/media.ts         # 图片上传（multipart）与读取
  modules/player-portal.ts # 陪玩账号登录 + 个人数据
  modules/events.ts        # SSE 实时推送
  db/                      # 连接池 + schema（含种子数据）
  middleware/auth.ts       # 管理端 Cookie JWT 鉴权
  middleware/player-auth.ts# 陪玩端 Cookie JWT 鉴权
frontend/src/
  pages/Index.tsx              # 排行榜首页（含俱乐部评分）
  pages/PlayerDetail.tsx       # 陪玩详情 + 星级评价
  pages/admin/                 # 登录 + 数据看板
  pages/player/                # 陪玩登录 + 个人中心
  components/ranking/          # 领奖台 / 卡片 / 筛选栏 / 统计 / 星级评分 / 俱乐部
  components/admin/            # 陪玩表单（含头像上传）/ 账号弹窗 / 俱乐部设置
  hooks/use-realtime.ts        # EventSource 订阅 + 缓存失效
```
