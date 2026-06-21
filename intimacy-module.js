/* ================================================================
   intimacy-module.js — AI伙伴亲密度核心模块 (ES Module)
   ================================================================
   职责：积分管理、等级计算、对话生成、localStorage 读写、事件派发
   用法：import { IntimacyManager } from './intimacy-module.js';
   ================================================================ */

const STORAGE_KEY = 'intimacy_data';

export const DEFAULT_CONFIG = {
  levels: [
    { id: 'stranger', label: '陌生人', maxScore: 100, emoji: '🧊', color: '#9E9E9E' },
    { id: 'buddy',    label: '学习搭子', maxScore: 300, emoji: '😊', color: '#42A5F5' },
    { id: 'rival',    label: '思维宿敌', maxScore: Infinity, emoji: '😏', color: '#FFD700' },
  ],
  scoreRules: {
    deepAnswer: 5,
    revisit: 2,
    passport: 10,
  },
  nickname: '学霸', // Lv.3 自定义昵称

  // Dialog templates per level, keyed by action type
  dialogs: {
    stranger: {
      greeting: [
        '系统初始化完成。用户，请开始学习。',
        '检测到新用户。学习记录已创建。',
        '用户，建议你立即开始学习任务。',
      ],
      deepAnswer: [
        '回答已记录。+{score}分。',
        '分析完成。积分增加{score}。',
        '数据已存档。+{score}分。',
      ],
      revisit: [
        '重新审视已记录。+{score}分。',
        '重新审视操作确认。积分+{score}。',
      ],
      passport: [
        '护照导出完成。+{score}分。',
        '数据导出成功。积分+{score}。',
      ],
      wrongAnswer: [
        '回答错误。建议重新学习。',
        '错误。再次尝试前请复盘。',
      ],
      levelUp: [
        '等级提升。当前等级：{level}。',
      ],
    },
    buddy: {
      greeting: [
        '哟，同学，又来学习啦？(｡•̀ᴗ-)✧',
        '同学好呀~今天一起加油呢~ ✨',
        '哈喽！准备好开始学习了吗？(๑•̀ㅂ•́)و✧',
      ],
      deepAnswer: [
        '哇哦~这个回答很有深度呢！+{score}分 ✨',
        '厉害厉害！分析得很到位哦~ +{score}分！',
        '不错不错，继续保持这个水平呢~ +{score}分 ( •̀ ω •́ )✧',
      ],
      revisit: [
        '重新审视很棒哦~会反思的同学最厉害！+{score}分',
        '回头看一遍是好习惯呢~ +{score}分！',
      ],
      passport: [
        '护照导出啦~你的成长记录又丰富了！+{score}分 📋',
        '哇，护照又更新了哦~越来越厉害了！+{score}分',
      ],
      wrongAnswer: [
        '哎，要不再看看视频第2分15秒？',
        '唔…差点意思呢~再仔细想想？',
        '别急别急，回头看看材料再试一次~',
      ],
      levelUp: [
        '恭喜升级！你已经是个厉害的学习搭子了！🎉',
        'Level Up！同学，你变强了！(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
      ],
    },
    rival: {
      greeting: [
        '哟，{nickname}，今天打算认真学还是继续摸鱼？',
        '终于来了啊{ nickname }，我还以为你放弃了。',
        '{nickname}，今天可别让我失望。',
      ],
      deepAnswer: [
        '不错嘛，这个回答居然有点水平。+{score}分。',
        '哼，算你这次动了脑子。+{score}分。',
        '可以啊{ nickname }，这次分析确实犀利。+{score}分。',
      ],
      revisit: [
        '重新审视？终于开始认真了。+{score}分。',
        '懂得反思了？有进步嘛。+{score}分。',
      ],
      passport: [
        '护照导出。拿去炫耀吧，反正也就那样。+{score}分。',
        '导出就导出，不过别太得意。+{score}分。',
      ],
      wrongAnswer: [
        '就这？你上一关可不是这个水平。',
        '喂{ nickname }，这种错误也太低级了吧？',
        '哈？你认真的？再想想。',
      ],
      slacking: [
        '喂，{nickname}，再不动脑子就要生锈了。',
        '发呆呢？要不要我帮你把题目读一遍？',
        '{nickname}同学，你的对手可不会等你。',
      ],
      levelUp: [
        '哼，勉强承认你算个对手了。来吧，{nickname}！',
        '终于到这一步了。{nickname}，让我们认真较量一场。',
      ],
    },
  },
};

export class IntimacyManager {
  /**
   * @param {Object} [customConfig] — 自定义配置，与 DEFAULT_CONFIG 深度合并
   */
  constructor(customConfig) {
    this.config = this._deepMerge(DEFAULT_CONFIG, customConfig || {});
    this._data = this._load();
    this._pendingDialog = null; // dialog queued for typing effect
  }

  // ============ PUBLIC API ============

  /** 当前积分 */
  get score() {
    return this._data.score;
  }

  /** 当前等级索引 (0-based) */
  get levelIndex() {
    return this._calcLevelIndex(this._data.score);
  }

  /** 当前等级对象 */
  get level() {
    return this.config.levels[this.levelIndex];
  }

  /** 上一等级对象（用于升级检测） */
  get _prevLevel() {
    const idx = this._calcLevelIndex(this._data.prevScore || 0);
    return this.config.levels[idx];
  }

  /**
   * 增加积分并触发对话
   * @param {'deepAnswer'|'revisit'|'passport'} actionType
   * @returns {{ newScore: number, levelChanged: boolean, oldLevel: object|null, newLevel: object, dialog: string }}
   */
  addScore(actionType) {
    const rule = this.config.scoreRules[actionType];
    if (!rule) throw new Error(`Unknown action type: ${actionType}`);

    const oldLevel = this.level;
    const oldScore = this._data.score;
    this._data.prevScore = oldScore;
    this._data.score += rule;
    const newLevel = this.level;
    const levelChanged = newLevel.id !== oldLevel.id;

    let dialog;
    if (levelChanged) {
      dialog = this._pickDialog(newLevel.id, 'levelUp', { level: newLevel.label, score: rule });
      this._dispatchLevelUp(oldLevel, newLevel);
    } else {
      dialog = this._pickDialog(newLevel.id, actionType, { score: rule });
    }

    this._save();
    this._pendingDialog = dialog;
    return {
      newScore: this._data.score,
      levelChanged,
      oldLevel: levelChanged ? oldLevel : null,
      newLevel,
      dialog,
    };
  }

  /**
   * 获取一句当前等级的随机对话（非积分操作，如问候）
   * @param {'greeting'|'slacking'|'wrongAnswer'} type
   * @returns {string}
   */
  getDialog(type) {
    const lvl = this.level;
    const pool = this.config.dialogs[lvl.id] && this.config.dialogs[lvl.id][type];
    if (!pool || pool.length === 0) return '';
    return this._fillTemplate(pool[Math.floor(Math.random() * pool.length)], {});
  }

  /** 获取下一级所需积分上限 */
  get nextLevelScore() {
    const lvl = this.level;
    return lvl.maxScore === Infinity ? this._data.score : lvl.maxScore;
  }

  /** 当前等级进度百分比 (0–100) */
  get progressPercent() {
    const lvl = this.level;
    if (lvl.maxScore === Infinity) return 100;
    const prevMax = this.levelIndex > 0 ? this.config.levels[this.levelIndex - 1].maxScore : 0;
    const range = lvl.maxScore - prevMax;
    const current = this._data.score - prevMax;
    return Math.min(100, Math.round((current / range) * 100));
  }

  /** 重置数据（清除 localStorage） */
  reset() {
    this._data = { score: 0, prevScore: 0 };
    this._save();
  }

  /** 获取当前存储的原始数据 */
  getRawData() {
    return { ...this._data };
  }

  // ============ INTERNAL ============

  _calcLevelIndex(score) {
    const levels = this.config.levels;
    for (let i = 0; i < levels.length; i++) {
      if (score < levels[i].maxScore) return i;
    }
    return levels.length - 1;
  }

  _pickDialog(levelId, actionType, vars) {
    const pool = this.config.dialogs[levelId] && this.config.dialogs[levelId][actionType];
    const template = pool && pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : '...';
    return this._fillTemplate(template, vars);
  }

  _fillTemplate(template, vars) {
    let result = template;
    result = result.replace(/\{nickname\}/g, this.config.nickname);
    result = result.replace(/\{score\}/g, vars.score || '?');
    result = result.replace(/\{level\}/g, vars.level || '?');
    return result;
  }

  _dispatchLevelUp(oldLevel, newLevel) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('intimacyLevelUp', {
        detail: { oldLevel, newLevel, score: this._data.score },
      }));
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (e) { /* ignore */ }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.score === 'number') return data;
      }
    } catch (e) { /* ignore */ }
    return { score: 0, prevScore: 0 };
  }

  _deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this._deepMerge(base[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }
}

// ============ STATIC METHODS ============

/**
 * Fetch a JSON config file and return parsed options for the constructor.
 * The config JSON defines static metadata: levels, dialogs, score rules, etc.
 * Runtime values (score) are stored in localStorage, NOT in the JSON.
 *
 * @param {string} url — URL to the JSON config file
 * @returns {Promise<Object>} — options ready for `new IntimacyManager(opts)`
 */
IntimacyManager.loadConfig = async function (url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('IntimacyManager.loadConfig: failed to fetch ' + url);
  const cfg = await resp.json();
  if (!cfg.levels || !Array.isArray(cfg.levels)) {
    throw new Error('IntimacyManager.loadConfig: config must have a "levels" array');
  }
  // Normalize Infinity (not valid in JSON)
  cfg.levels.forEach(l => {
    if (l.maxScore === 999999) l.maxScore = Infinity;
  });
  return cfg;
};