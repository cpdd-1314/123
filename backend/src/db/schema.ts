/**
 * 数据库结构 + 种子数据（幂等，服务启动时执行）
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id             SERIAL PRIMARY KEY,
  nickname       VARCHAR(50)  NOT NULL,
  avatar         TEXT         NOT NULL DEFAULT '',
  game           VARCHAR(50)  NOT NULL,
  tags           TEXT[]       NOT NULL DEFAULT '{}',
  description    TEXT         NOT NULL DEFAULT '',
  price_per_hour INTEGER      NOT NULL DEFAULT 30 CHECK (price_per_hour >= 0),
  rating         NUMERIC(2,1) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  orders         INTEGER      NOT NULL DEFAULT 0 CHECK (orders >= 0),
  score          INTEGER      NOT NULL DEFAULT 0,
  is_online      BOOLEAN      NOT NULL DEFAULT true,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offline')),
  is_pinned      BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_score  ON players (score DESC);
CREATE INDEX IF NOT EXISTS idx_players_game   ON players (game);
CREATE INDEX IF NOT EXISTS idx_players_status ON players (status);

-- 种子数据（仅在表为空时插入）
INSERT INTO players (nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, is_online, status, is_pinned)
SELECT * FROM (VALUES
  ('夜刃',        '/avatars/01.svg', '王者荣耀', ARRAY['技术陪','打野','荣耀王者'], '巅峰赛2400分打野，节奏发动机，包赢不包输但包爽。', 45, 4.9, 1286, 9860, true,  'active', true),
  ('星河入梦',    '/avatars/02.svg', '英雄联盟', ARRAY['技术陪','中单','脚本级走位'], '一区大师中单，对线细节拉满，教你意识而非操作。', 50, 4.8, 964,  9420, true,  'active', false),
  ('糖豆Mika',    '/avatars/03.svg', '和平精英', ARRAY['娱乐陪','语音陪','小姐姐'],   '声音甜到犯规，刚枪偶尔Carry，快乐永远是第一位。', 30, 4.9, 1520, 9310, true,  'active', true),
  ('无情铁手',    '/avatars/04.svg', '无畏契约', ARRAY['技术陪','决queen','狙神'],    '辐能战神，一杆狙守一整局，暴躁但靠谱。', 55, 4.7, 742,  8760, false, 'active', false),
  ('月亮邮递员',  '/avatars/05.svg', '王者荣耀', ARRAY['娱乐陪','小姐姐','治愈系'],   '输了也不喷人，专门负责哄你开心和轻松上星。', 28, 5.0, 1103, 8640, true,  'active', false),
  ('深海回声',    '/avatars/06.svg', '永劫无间', ARRAY['技术陪','单排','振刀怪'],    '国服前500振刀怪，火男冲冠绝不回头。', 42, 4.8, 658,  8210, true,  'active', false),
  ('橘长',        '/avatars/07.svg', '英雄联盟', ARRAY['娱乐陪','AD','整活王'],      '白金局鬼才AD，死法千奇百怪，节目效果爆炸。', 25, 4.6, 2087, 8020, true,  'active', false),
  ('零号病人',    '/avatars/08.svg', '和平精英', ARRAY['技术陪','指挥','刚枪'],      '职业队退役指挥，听指挥吃鸡率提升60%。', 48, 4.9, 891,  7980, true,  'active', false),
  ('奶糖泡芙',    '/avatars/09.svg', '王者荣耀', ARRAY['小姐姐','辅助','氛围组'],    '国服瑶妹本瑶，全程护你，情绪价值直接拉满。', 32, 4.9, 1345, 7760, true,  'active', false),
  ('风间雾',      '/avatars/10.svg', '无畏契约', ARRAY['技术陪','烟位','老六'],      '烟位老艺术家，神出鬼没，偷人专业户。', 40, 4.7, 534,  7510, false, 'active', false),
  ('麻辣香锅G',   '/avatars/11.svg', '永劫无间', ARRAY['娱乐陪','语音陪','段子手'],  '打游戏是副业，讲段子是主业，笑出声算我的。', 26, 4.8, 1620, 7320, true,  'active', false),
  ('白泽',        '/avatars/12.svg', '和平精英', ARRAY['技术陪','狙击','苟分'],      'LYB式狙击手，一枪一个安静小学生。', 38, 4.8, 706,  7150, true,  'active', false)
) AS seed(nickname, avatar, game, tags, description, price_per_hour, rating, orders, score, is_online, status, is_pinned)
WHERE NOT EXISTS (SELECT 1 FROM players);
`
