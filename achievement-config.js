/* ================================================================
   achievement-config.js — 成就博物馆 · 成就定义配置
   ================================================================
   定义所有成就的元数据：解锁条件、特权、图标、稀有度。
   可通过外部传入覆盖或扩展。
   ================================================================ */

const ACHIEVEMENTS_CONFIG = {
  first_awaken: {
    id: 'first_awaken',
    name: '初次觉醒',
    description: '完成第1关',
    unlockCondition: { type: 'levelComplete', value: 1 },
    privilege: { type: 'video_speed', value: 0.5, description: '解锁视频 0.5 倍速播放' },
    icon: '🌱',
    rarity: 'common',
  },
  persistence_3: {
    id: 'persistence_3',
    name: '三日之约',
    description: '连续 3 天登录学习',
    unlockCondition: { type: 'streakDays', value: 3 },
    privilege: { type: 'daily_bonus', value: 5, description: '每日首次学习额外 +5 积分' },
    icon: '📅',
    rarity: 'rare',
  },
  empathy_master: {
    id: 'empathy_master',
    name: '端水大师',
    description: '连续 3 次完美复述对方观点',
    unlockCondition: { type: 'perfectEmpathy', value: 3 },
    privilege: { type: 'skip_blindbox', value: true, description: '解锁"免盲盒"卡（跳过不想抽的盲盒）' },
    icon: '⚖️',
    rarity: 'rare',
  },
  time_traveler: {
    id: 'time_traveler',
    name: '时空旅人',
    description: '提出 5 个"如果……会怎样"的假设',
    unlockCondition: { type: 'hypotheticalCount', value: 5 },
    privilege: { type: 'ai_predict', value: true, description: '解锁 AI"预判"功能（提前知道下一个盲盒类别）' },
    icon: '🔮',
    rarity: 'epic',
  },
  deep_thinker: {
    id: 'deep_thinker',
    name: '深度思考者',
    description: '单次回答超过 200 字（且非废话）10 次',
    unlockCondition: { type: 'deepAnswerCount', value: 10 },
    privilege: { type: 'thought_export', value: true, description: '解锁"思维导出"功能（一键导出所有观点为文本）' },
    icon: '🧠',
    rarity: 'rare',
  },
  logical_sharp: {
    id: 'logical_sharp',
    name: '逻辑利刃',
    description: '被 AI"杠精"反驳后，3 次成功修正逻辑',
    unlockCondition: { type: 'logicalFixCount', value: 3 },
    privilege: { type: 'logic_shield', value: 0.5, description: '解锁"逻辑护盾"（答错时少扣 50% 分数）' },
    icon: '⚔️',
    rarity: 'epic',
  },
  evidence_hunter: {
    id: 'evidence_hunter',
    name: '证据猎人',
    description: '引用视频细节超过 20 次',
    unlockCondition: { type: 'evidenceCount', value: 20 },
    privilege: { type: 'speed_review', value: 1.5, description: '解锁"倍速回看"（可 1.5 倍速快速回顾）' },
    icon: '🔍',
    rarity: 'rare',
  },
  perspective_king: {
    id: 'perspective_king',
    name: '视角之王',
    description: '完成"强制换位"任务累计 10 次',
    unlockCondition: { type: 'perspectiveCount', value: 10 },
    privilege: { type: 'god_view', value: true, description: '解锁"上帝视角"（可同时看到 AI 模拟的 3 种立场）' },
    icon: '👑',
    rarity: 'legendary',
  },
  passport_collector: {
    id: 'passport_collector',
    name: '护照收藏家',
    description: '导出"思辨护照"累计 5 次',
    unlockCondition: { type: 'passportExportCount', value: 5 },
    privilege: { type: 'skin_fragment', value: true, description: '解锁"皮肤碎片"（可兑换专属界面主题）' },
    icon: '🎫',
    rarity: 'epic',
  },
  zen_master: {
    id: 'zen_master',
    name: '禅定大师',
    description: '连续 10 次答对且不触发"求助"',
    unlockCondition: { type: 'zenStreakCount', value: 10 },
    privilege: { type: 'zen_mode', value: true, description: '解锁"免打扰"（学习时屏蔽 AI 毒舌，安静模式）' },
    icon: '🧘',
    rarity: 'legendary',
  },
};

// Rarity display config
const RARITY_CONFIG = {
  common:    { label: '普通', color: '#9E9E9E', glow: 'rgba(158,158,158,0.3)' },
  rare:      { label: '稀有', color: '#42A5F5', glow: 'rgba(66,165,245,0.3)' },
  epic:      { label: '史诗', color: '#AB47BC', glow: 'rgba(171,71,188,0.3)' },
  legendary: { label: '传说', color: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
};