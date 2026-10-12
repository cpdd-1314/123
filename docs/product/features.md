# 陪玩排行榜 - Product Requirements

---

## 1. Strategy (战略层)

**用户诉求：** 想找靠谱游戏陪玩的玩家（以《王者荣耀》《英雄联盟》《和平精英》等热门游戏为主）。痛点是平台信息杂乱、不知道选谁、担心被坑。渴望看到一个**有公信力的榜单**，按实力/口碑快速找到心仪陪玩，并直接下单。

**商业目标：** 提升陪玩曝光与转化率，让优质陪玩获得更多订单。

**核心定调：** 电竞感、热血、榜单荣誉感、暗夜霓虹。

---

## 2. Scope (范围层)

核心定调为「电竞感、热血、榜单荣誉感」，页面需要：

**不要：** 支付/交易闭环、即时聊天、复杂权限系统（RBAC）——本期聚焦"榜单展示 + 后台信息维护"。

**必须要有：**
- **排行榜首页**：TOP3 领奖台 + 榜单列表，支持按游戏筛选、按热度/评分/单价排序、关键词搜索
- **陪玩卡片**：头像、昵称、游戏、声线/标签、评分、接单数、单价、简介
- **后台管理**：管理员登录后，可新增/编辑/下架陪玩，调整积分（热度分）、订单数、评分，置顶推荐
- **数据看板**：后台首页展示总陪玩数、在架数、总订单、平均评分

---

## 3. Structure (结构层)

**页面架构：** 单页榜单 + 独立后台。前台重氛围（Hero + 榜单），后台重效率（表格 + 表单）。

**注意力流转：** Hero（榜单标题+实时统计）→ 筛选/排序工具栏 → TOP3 领奖台 → 完整榜单 → 卡片悬浮操作（查看详情/联系）。

### Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | 排行榜首页 | Hero + 统计数字 + 筛选排序 + TOP3 + 完整榜单 |
| `/player/:id` | 陪玩详情 | 大图卡片、完整资料、技能标签、数据面板 |
| `/admin/login` | 后台登录 | 账号密码登录（JWT） |
| `/admin` | 后台看板 | 数据统计 + 陪玩管理表格（增/改/删/上下架/置顶） |

### Data Model

#### players（陪玩）
| Field | Type | Description |
|-------|------|-------------|
| id | serial PK | 主键 |
| nickname | varchar(50) | 昵称 |
| avatar | text | 头像 URL |
| game | varchar(50) | 主打游戏（王者荣耀/英雄联盟/和平精英/无畏契约/永劫无间） |
| tags | text[] | 标签（如：技术陪、语音陪、娱乐陪、小姐姐） |
| description | text | 简介 |
| price_per_hour | int | 单价（元/小时） |
| rating | numeric(2,1) | 评分 0-5 |
| orders | int | 接单数 |
| score | int | 热度积分（后台可调，决定排名） |
| is_online | bool | 是否在线 |
| status | varchar(20) | active / offline（上架/下架） |
| is_pinned | bool | 是否置顶推荐 |
| created_at | timestamptz | 创建时间 |

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/players` | 榜单查询（query: game, keyword, sort=score/rating/orders/price, status=active） |
| GET | `/api/players/:id` | 陪玩详情 |
| GET | `/api/stats` | 公开统计（总人数、在架、总订单、均分） |
| POST | `/api/admin/login` | 管理员登录，返回 JWT |
| GET | `/api/admin/me` | 校验 token |
| GET | `/api/admin/players` | 管理端列表（含下架） |
| POST | `/api/admin/players` | 新增陪玩 |
| PUT | `/api/admin/players/:id` | 编辑陪玩 |
| DELETE | `/api/admin/players/:id` | 删除陪玩 |
| PATCH | `/api/admin/players/:id/status` | 上下架 |
| PATCH | `/api/admin/players/:id/pin` | 置顶/取消 |

---

## 4. Skeleton (框架层)

**导航形态：** 顶部玻璃拟态导航栏（Logo + 榜单/后台入口）；后台为左侧边栏布局。

**页面布局：**
- 排行榜首页：Hero（标题+副标题+4个统计数字 CountUp）→ 工具栏（游戏筛选 chip + 排序下拉 + 搜索框）→ TOP3 领奖台（中间高两侧低的台阶卡片）→ 榜单网格（卡片，前三名有金银铜徽章）
- 后台：侧边栏（看板/陪玩管理/退出）+ 主区（统计卡 + 可编辑表格 + 新增/编辑弹窗表单）

---

## 5. Surface (表现层)

电竞暗夜风：深色底 + 霓虹紫/青渐变 + 金属质感徽章。圆角卡片、玻璃拟态、悬浮发光。排名 1/2/3 用金/银/铜渐变徽章。
