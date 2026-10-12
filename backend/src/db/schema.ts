/**
 * 数据库结构 + 种子数据（幂等，服务启动时执行）
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id                    SERIAL PRIMARY KEY,
  nickname              VARCHAR(50)  NOT NULL,
  avatar                TEXT         NOT NULL DEFAULT '',
  game                  VARCHAR(50)  NOT NULL,
  tags                  TEXT[]       NOT NULL DEFAULT '{}',
  description           TEXT         NOT NULL DEFAULT '',
  price_per_hour        INTEGER      NOT NULL DEFAULT 30 CHECK (price_per_hour >= 0),
  rating                NUMERIC(2,1) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  orders                INTEGER      NOT NULL DEFAULT 0 CHECK (orders >= 0),
  score                 INTEGER      NOT NULL DEFAULT 0,
  status                VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offline')),
  is_pinned             BOOLEAN      NOT NULL DEFAULT false,
  account_username      VARCHAR(50),
  account_password_hash TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 迁移：移除旧的在线状态字段（已废弃）
ALTER TABLE players DROP COLUMN IF EXISTS is_online;
-- 迁移：补齐陪玩账号字段
ALTER TABLE players ADD COLUMN IF NOT EXISTS account_username      VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS account_password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_account_username
  ON players (account_username) WHERE account_username IS NOT NULL;

-- 迁移：每日签到日期（按天去重）+ 待领取人气（接单/好评奖励，由陪玩在个人中心领取）
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_checkin_date DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS pending_score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_players_score  ON players (score DESC);
CREATE INDEX IF NOT EXISTS idx_players_game   ON players (game);
CREATE INDEX IF NOT EXISTS idx_players_status ON players (status);

-- 游戏目录：管理员可在后台自定义增删，前端下拉与筛选同步
CREATE TABLE IF NOT EXISTS games (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO games (name, sort_order)
SELECT v.name, v.ord FROM (VALUES
  ('王者荣耀', 1),
  ('英雄联盟', 2),
  ('和平精英', 3),
  ('无畏契约', 4),
  ('永劫无间', 5)
) AS v(name, ord)
WHERE NOT EXISTS (SELECT 1 FROM games);

-- 星级评价：可对陪玩（target_type='player'）或俱乐部（target_type='club'）打分
CREATE TABLE IF NOT EXISTS ratings (
  id          SERIAL PRIMARY KEY,
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('player', 'club')),
  target_id   INTEGER     NOT NULL DEFAULT 0,
  stars       SMALLINT    NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment     TEXT        NOT NULL DEFAULT '',
  fingerprint VARCHAR(64) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_unique
  ON ratings (target_type, target_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_ratings_target
  ON ratings (target_type, target_id);

-- 上传的图片（头像等），以二进制存库，避免云平台磁盘重置丢失
CREATE TABLE IF NOT EXISTS media (
  id         SERIAL PRIMARY KEY,
  mime       VARCHAR(60) NOT NULL,
  size       INTEGER     NOT NULL DEFAULT 0,
  data       BYTEA       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 俱乐部信息（单行）
CREATE TABLE IF NOT EXISTS club (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  name        VARCHAR(80) NOT NULL DEFAULT '𝓮𝓵𝓮𝓿𝓮𝓷十一愿club',
  slogan      VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  avatar      TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT club_single_row CHECK (id = 1)
);

INSERT INTO club (id, name, slogan, description)
VALUES (
  1,
  '𝓮𝓵𝓮𝓿𝓮𝓷十一愿club',
  '实力为尊 · 服务至上',
  '我们是一家专注电竞陪玩服务的俱乐部，汇聚各游戏顶尖高手。所有陪玩实力均经过严格审核，信息由俱乐部统一维护。'
)
ON CONFLICT (id) DO NOTHING;

-- 迁移：修正俱乐部名称（历史数据）
UPDATE club SET name = '𝓮𝓵𝓮𝓿𝓮𝓷十一愿club', updated_at = NOW()
WHERE id = 1 AND name = '巅峰陪玩俱乐部';

-- 订单表：管理员发布订单，陪玩可查看并接单
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(80)  NOT NULL,
  game           VARCHAR(50)  NOT NULL,
  description    TEXT         NOT NULL DEFAULT '',
  price          INTEGER      NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration       INTEGER      NOT NULL DEFAULT 1 CHECK (duration > 0),  -- 小时
  customer_note  VARCHAR(200) NOT NULL DEFAULT '',
  status         VARCHAR(20)  NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'taken', 'done', 'canceled')),
  -- 指定陪玩：为空表示所有陪玩可见可接
  assigned_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  -- 接单陪玩
  taken_by_id    INTEGER REFERENCES players(id) ON DELETE SET NULL,
  taken_by_name  VARCHAR(50),
  taken_at       TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned  ON orders (assigned_player_id);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders (created_at DESC);

-- 排行榜历史快照：按周/月归档榜单，用于「上周最佳 / 上月最佳」回看
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id             SERIAL PRIMARY KEY,
  period_type    VARCHAR(10) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  -- 周期起点：weekly 为该周周一（ISO 周），monthly 为该月 1 号
  period_start   DATE NOT NULL,
  player_id      INTEGER REFERENCES players(id) ON DELETE CASCADE,
  nickname       VARCHAR(50) NOT NULL,
  avatar         TEXT NOT NULL DEFAULT '',
  game           VARCHAR(50) NOT NULL DEFAULT '',
  rank           INTEGER NOT NULL CHECK (rank > 0),
  score          INTEGER NOT NULL DEFAULT 0,
  orders         INTEGER NOT NULL DEFAULT 0,
  rating         NUMERIC(3,1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_type, period_start, player_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_period ON ranking_snapshots (period_type, period_start, rank);

-- 种子数据（仅在表为空时插入）
INSERT INTO players (nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, status, is_pinned)
SELECT * FROM (VALUES
  ('夜刃',        '/avatars/01.svg', '王者荣耀', ARRAY['技术陪','打野','荣耀王者'], '巅峰赛2400分打野，节奏发动机，包赢不包输但包爽。', 45, 4.9, 1286, 9860, 'active', true),
  ('星河入梦',    '/avatars/02.svg', '英雄联盟', ARRAY['技术陪','中单','脚本级走位'], '一区大师中单，对线细节拉满，教你意识而非操作。', 50, 4.8, 964,  9420, 'active', false),
  ('糖豆Mika',    '/avatars/03.svg', '和平精英', ARRAY['娱乐陪','语音陪','小姐姐'],   '声音甜到犯规，刚枪偶尔Carry，快乐永远是第一位。', 30, 4.9, 1520, 9310, 'active', true),
  ('无情铁手',    '/avatars/04.svg', '无畏契约', ARRAY['技术陪','决queen','狙神'],    '辐能战神，一杆狙守一整局，暴躁但靠谱。', 55, 4.7, 742,  8760, 'active', false),
  ('月亮邮递员',  '/avatars/05.svg', '王者荣耀', ARRAY['娱乐陪','小姐姐','治愈系'],   '输了也不喷人，专门负责哄你开心和轻松上星。', 28, 5.0, 1103, 8640, 'active', false),
  ('深海回声',    '/avatars/06.svg', '永劫无间', ARRAY['技术陪','单排','振刀怪'],    '国服前500振刀怪，火男冲冠绝不回头。', 42, 4.8, 658,  8210, 'active', false),
  ('橘长',        '/avatars/07.svg', '英雄联盟', ARRAY['娱乐陪','AD','整活王'],      '白金局鬼才AD，死法千奇百怪，节目效果爆炸。', 25, 4.6, 2087, 8020, 'active', false),
  ('零号病人',    '/avatars/08.svg', '和平精英', ARRAY['技术陪','指挥','刚枪'],      '职业队退役指挥，听指挥吃鸡率提升60%。', 48, 4.9, 891,  7980, 'active', false),
  ('奶糖泡芙',    '/avatars/09.svg', '王者荣耀', ARRAY['小姐姐','辅助','氛围组'],    '国服瑶妹本瑶，全程护你，情绪价值直接拉满。', 32, 4.9, 1345, 7760, 'active', false),
  ('风间雾',      '/avatars/10.svg', '无畏契约', ARRAY['技术陪','烟位','老六'],      '烟位老艺术家，神出鬼没，偷人专业户。', 40, 4.7, 534,  7510, 'active', false),
  ('麻辣香锅G',   '/avatars/11.svg', '永劫无间', ARRAY['娱乐陪','语音陪','段子手'],  '打游戏是副业，讲段子是主业，笑出声算我的。', 26, 4.8, 1620, 7320, 'active', false),
  ('白泽',        '/avatars/12.svg', '和平精英', ARRAY['技术陪','狙击','苟分'],      'LYB式狙击手，一枪一个安静小学生。', 38, 4.8, 706,  7150, 'active', false)
) AS seed(nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, status, is_pinned)
WHERE NOT EXISTS (SELECT 1 FROM players);

-- 人数过少时回填示例陪玩，保证榜单不会空白（仅在陪玩总数 < 6 时触发，避免覆盖真实数据）
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM players) < 6 THEN
    INSERT INTO players (nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, status, is_pinned)
    SELECT * FROM (VALUES
      ('夜刃',        '/avatars/01.svg', '王者荣耀', ARRAY['技术陪','打野','荣耀王者'], '巅峰赛2400分打野，节奏发动机，包赢不包输但包爽。', 45, 4.9, 1286, 9860, 'active', true),
      ('星河入梦',    '/avatars/02.svg', '英雄联盟', ARRAY['技术陪','中单','脚本级走位'], '一区大师中单，对线细节拉满，教你意识而非操作。', 50, 4.8, 964,  9420, 'active', false),
      ('糖豆Mika',    '/avatars/03.svg', '和平精英', ARRAY['娱乐陪','语音陪','小姐姐'],   '声音甜到犯规，刚枪偶尔Carry，快乐永远是第一位。', 30, 4.9, 1520, 9310, 'active', true),
      ('无情铁手',    '/avatars/04.svg', '无畏契约', ARRAY['技术陪','决queen','狙神'],    '辐能战神，一杆狙守一整局，暴躁但靠谱。', 55, 4.7, 742,  8760, 'active', false),
      ('月亮邮递员',  '/avatars/05.svg', '王者荣耀', ARRAY['娱乐陪','小姐姐','治愈系'],   '输了也不喷人，专门负责哄你开心和轻松上星。', 28, 5.0, 1103, 8640, 'active', false),
      ('深海回声',    '/avatars/06.svg', '永劫无间', ARRAY['技术陪','单排','振刀怪'],    '国服前500振刀怪，火男冲冠绝不回头。', 42, 4.8, 658,  8210, 'active', false),
      ('橘长',        '/avatars/07.svg', '英雄联盟', ARRAY['娱乐陪','AD','整活王'],      '白金局鬼才AD，死法千奇百怪，节目效果爆炸。', 25, 4.6, 2087, 8020, 'active', false),
      ('零号病人',    '/avatars/08.svg', '和平精英', ARRAY['技术陪','指挥','刚枪'],      '职业队退役指挥，听指挥吃鸡率提升60%。', 48, 4.9, 891,  7980, 'active', false),
      ('奶糖泡芙',    '/avatars/09.svg', '王者荣耀', ARRAY['小姐姐','辅助','氛围组'],    '国服瑶妹本瑶，全程护你，情绪价值直接拉满。', 32, 4.9, 1345, 7760, 'active', false),
      ('风间雾',      '/avatars/10.svg', '无畏契约', ARRAY['技术陪','烟位','老六'],      '烟位老艺术家，神出鬼没，偷人专业户。', 40, 4.7, 534,  7510, 'active', false),
      ('麻辣香锅G',   '/avatars/11.svg', '永劫无间', ARRAY['娱乐陪','语音陪','段子手'],  '打游戏是副业，讲段子是主业，笑出声算我的。', 26, 4.8, 1620, 7320, 'active', false),
      ('白泽',        '/avatars/12.svg', '和平精英', ARRAY['技术陪','狙击','苟分'],      'LYB式狙击手，一枪一个安静小学生。', 38, 4.8, 706,  7150, 'active', false)
    ) AS seed(nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, status, is_pinned);
  END IF;
END $$;
`
