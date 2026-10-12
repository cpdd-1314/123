# 陪玩排行榜 - Product Requirements

---

## 1. Strategy (战略层)

**用户诉求：** 想找靠谱游戏陪玩的玩家（以《王者荣耀》《英雄联盟》《和平精英》等热门游戏为主）。痛点是平台信息杂乱、不知道选谁、担心被坑。渴望看到一个**有公信力的榜单**，按实力/口碑快速了解心仪陪玩。

**商业目标：** 提升陪玩曝光度，让优质陪玩获得更多关注；榜单信息全部由后台统一维护。

**核心定调：** 电竞感、热血、榜单荣誉感、暗夜霓虹。

---

## 2. Scope (范围层)

核心定调为「电竞感、热血、榜单荣誉感」，页面需要：

**不要：** 支付/交易闭环、即时聊天、复杂权限系统（RBAC）——本期聚焦"榜单展示 + 评价互动 + 后台信息维护"。

**必须要有：**
- **排行榜首页**：TOP3 领奖台 + 榜单列表，支持按游戏筛选、按热度/评分/单价排序、关键词搜索
- **陪玩卡片**：头像、昵称、游戏、标签、星级、人气、单价、简介
- **俱乐部名片**：俱乐部信息 + 访客星级评价
- **星级评价**：访客可为每位陪玩与俱乐部各评一次（1-5 星，可附评论），展示均分/总数/分布
- **后台管理**：管理员登录后，可新增/编辑/下架陪玩，调整积分（热度分）、人气值、评分，置顶推荐，上传头像
- **陪玩账号**：为每位陪玩生成专属账号，陪玩登录后查看自己的资料与收到的评价
- **数据看板**：后台首页展示总陪玩数、在架数、已建账号数、累计评价、总人气

---

## 3. Structure (结构层)

**页面架构：** 单页榜单 + 陪玩详情 + 独立后台 + 陪玩中心。前台重氛围（Hero + 榜单 + 俱乐部），后台重效率（表格 + 表单）。

**注意力流转：** Hero（榜单标题+实时统计）→ 俱乐部名片与评分 → 筛选/排序工具栏 → TOP3 领奖台 → 完整榜单 → 陪玩详情与评价。

### Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | 排行榜首页 | Hero + 统计数字 + 俱乐部评分 + 筛选排序 + TOP3 + 完整榜单 |
| `/player/:id` | 陪玩详情 | 大图卡片、完整资料、技能标签、数据面板、星级评价与评论 |
| `/admin/login` | 后台登录 | 账号密码登录（JWT） |
| `/admin` | 后台看板 | 数据统计 + 陪玩管理表格 + 账号生成 + 俱乐部设置 |
| `/player/login` | 陪玩登录 | 陪玩账号登录 |
| `/player-center` | 陪玩个人中心 | 个人资料、热度、综合星级、收到的评价 |

### Data Model

#### players（陪玩）
| Field | Type | Description |
|-------|------|-------------|
| id | serial PK | 主键 |
| nickname | varchar(50) | 昵称 |
| avatar | text | 头像地址（可为上传图片 `/api/media/:id`） |
| game | varchar(50) | 主打游戏（王者荣耀/英雄联盟/和平精英/无畏契约/永劫无间） |
| tags | text[] | 标签（如：技术陪、语音陪、娱乐陪、小姐姐） |
| description | text | 简介 |
| price_per_hour | int | 单价（元/小时） |
| rating | numeric(2,1) | 后台设定评分 0-5 |
| orders | int | 人气值 |
| score | int | 热度积分（后台可调，决定排名） |
| status | varchar(20) | active / offline（上架/下架） |
| is_pinned | bool | 是否置顶推荐 |
| account_username | varchar(50) | 陪玩登录账号（唯一） |
| account_password_hash | text | 账号密码 bcrypt 哈希 |
| created_at | timestamptz | 创建时间 |

#### ratings（星级评价）
| Field | Type | Description |
|-------|------|-------------|
| id | serial PK | 主键 |
| target_type | varchar(10) | player / club |
| target_id | int | 陪玩 ID；俱乐部固定为 0 |
| stars | smallint | 1-5 星 |
| comment | text | 评论（可选，≤200 字） |
| fingerprint | varchar(64) | 访客指纹（IP+UA 的 SHA-256），用于每人一次去重 |
| created_at | timestamptz | 评价时间 |

> 唯一索引 `(target_type, target_id, fingerprint)` 保证同一访客对同一对象只能评价一次。

#### club（俱乐部，单行）
| Field | Type | Description |
|-------|------|-------------|
| id | int PK = 1 | 单行约束 |
| name | varchar(80) | 俱乐部名称 |
| slogan | varchar(200) | 标语 |
| description | text | 简介 |
| avatar | text | 头像地址 |

#### media（上传图片）
| Field | Type | Description |
|-------|------|-------------|
| id | serial PK | 主键，访问路径 `/api/media/:id` |
| mime | varchar(60) | MIME 类型 |
| size | int | 字节数（≤3MB） |
| data | bytea | 图片二进制（存库，云平台重置磁盘不丢图） |

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/players` | 榜单查询（query: game, keyword, sort=score/rating/orders/price, status=active） |
| GET | `/api/players/:id` | 陪玩详情 |
| GET | `/api/players/:id/ratings` | 陪玩评价汇总 + 列表 + 访客是否已评 |
| POST | `/api/players/:id/ratings` | 提交陪玩评价（每人一次） |
| GET | `/api/stats` | 公开统计（总人数、在架、总人气、后台均分、评价数、评价均分） |
| GET | `/api/club` | 俱乐部信息 + 评分汇总 |
| GET/POST | `/api/club/ratings` | 俱乐部评价列表 / 提交 |
| GET | `/api/media/:id` | 读取上传的图片 |
| POST | `/api/player/login` | 陪玩账号登录 |
| GET | `/api/player/me` | 陪玩个人数据与收到的评价 |
| POST | `/api/admin/login` | 管理员登录，返回 JWT |
| GET | `/api/admin/me` | 校验 token |
| GET | `/api/admin/players` | 管理端列表（含下架与账号信息） |
| POST | `/api/admin/players` | 新增陪玩 |
| PUT | `/api/admin/players/:id` | 编辑陪玩 |
| DELETE | `/api/admin/players/:id` | 删除陪玩 |
| PATCH | `/api/admin/players/:id/status` | 上下架 |
| PATCH | `/api/admin/players/:id/pin` | 置顶/取消 |
| POST | `/api/admin/players/:id/account` | 生成/重置陪玩账号（密码仅返回一次） |
| DELETE | `/api/admin/players/:id/account` | 注销陪玩账号 |
| POST | `/api/admin/media` | 上传图片（头像，≤3MB） |
| PUT | `/api/admin/club` | 修改俱乐部信息 |

---

## 4. Skeleton (框架层)

**导航形态：** 顶部玻璃拟态导航栏（Logo + 榜单/后台入口）；后台为左侧边栏布局。

**页面布局：**
- 排行榜首页：Hero（标题+副标题+4个统计数字 CountUp）→ 工具栏（游戏筛选 chip + 排序下拉 + 搜索框）→ TOP3 领奖台（中间高两侧低的台阶卡片）→ 榜单网格（卡片，前三名有金银铜徽章）
- 后台：侧边栏（看板/陪玩管理/退出）+ 主区（统计卡 + 可编辑表格 + 新增/编辑弹窗表单）

---

## 5. Surface (表现层)

电竞暗夜风：深色底 + 霓虹紫/青渐变 + 金属质感徽章。圆角卡片、玻璃拟态、悬浮发光。排名 1/2/3 用金/银/铜渐变徽章。
