/* ================================================================
   achievement-manager.js — 成就博物馆 · 核心逻辑模块
   ================================================================
   导出 AchievementManager 类
   职责：成就检查、解锁、特权管理、存储读写、事件派发
   用法：import { AchievementManager } from './achievement-manager.js';
   ================================================================ */

const STORAGE_KEY_UNLOCKED = 'achievements_unlocked';
const STORAGE_KEY_PRIVILEGES = 'privileges_owned';
const STORAGE_KEY_TRACKING = 'achievement_tracking';

export class AchievementManager {
  /**
   * @param {Object} [customConfig] — 自定义成就配置，与默认配置合并
   */
  constructor(customConfig) {
    const base = typeof ACHIEVEMENTS_CONFIG !== 'undefined'
      ? ACHIEVEMENTS_CONFIG
      : {};
    this.config = Object.assign({}, base, customConfig || {});
    this._unlocked = this._load(STORAGE_KEY_UNLOCKED, []);
    this._privileges = this._load(STORAGE_KEY_PRIVILEGES, {});
    this._tracking = this._load(STORAGE_KEY_TRACKING, {});
  }

  // ============ PUBLIC API ============

  /**
   * 检查所有成就，自动解锁满足条件的成就。
   * @param {Object} state — 当前游戏状态 { levelComplete, streakDays, ... }
   * @returns {Object[]} 本次新解锁的成就列表
   */
  checkAll(state) {
    const newlyUnlocked = [];
    for (const id of Object.keys(this.config)) {
      if (this._unlocked.includes(id)) continue;
      const ach = this.config[id];
      if (this._checkCondition(ach.unlockCondition, state, id)) {
        this._unlock(id, ach);
        newlyUnlocked.push(ach);
      }
    }
    if (newlyUnlocked.length > 0) {
      this._save(STORAGE_KEY_UNLOCKED, this._unlocked);
      this._save(STORAGE_KEY_PRIVILEGES, this._privileges);
    }
    return newlyUnlocked;
  }

  /**
   * 更新追踪进度（如"引用证据次数"）。
   * @param {string} type — 追踪类型（对应条件 type）
   * @param {number} value — 最新进度值
   */
  updateTracking(type, value) {
    this._tracking[type] = value;
    this._save(STORAGE_KEY_TRACKING, this._tracking);
  }

  /**
   * 递增追踪进度。
   * @param {string} type — 追踪类型
   * @param {number} [delta=1] — 增量
   */
  incrementTracking(type, delta) {
    delta = delta || 1;
    this._tracking[type] = (this._tracking[type] || 0) + delta;
    this._save(STORAGE_KEY_TRACKING, this._tracking);
  }

  /** 获取已解锁成就ID列表 */
  getUnlocked() {
    return this._unlocked.slice();
  }

  /** 获取所有成就的进度信息 */
  getProgress() {
    const result = {};
    for (const id of Object.keys(this.config)) {
      const ach = this.config[id];
      const cond = ach.unlockCondition;
      const current = this._tracking[cond.type] || 0;
      result[id] = {
        name: ach.name,
        icon: ach.icon,
        rarity: ach.rarity,
        current: Math.min(current, cond.value),
        target: cond.value,
        unlocked: this._unlocked.includes(id),
      };
    }
    return result;
  }

  /** 获取单个成就的进度 */
  getAchievementProgress(id) {
    const ach = this.config[id];
    if (!ach) return null;
    const cond = ach.unlockCondition;
    const current = this._tracking[cond.type] || 0;
    return {
      ...ach,
      current: Math.min(current, cond.value),
      target: cond.value,
      unlocked: this._unlocked.includes(id),
    };
  }

  /** 查询是否拥有某特权 */
  hasPrivilege(type) {
    return type in this._privileges;
  }

  /** 获取特权具体值 */
  getPrivilegeValue(type) {
    return this._privileges[type] || null;
  }

  /** 获取所有已拥有特权 */
  getPrivileges() {
    const result = [];
    for (const type of Object.keys(this._privileges)) {
      // Find the achievement that grants this privilege
      let ach = null;
      for (const id of Object.keys(this.config)) {
        if (this.config[id].privilege.type === type) {
          ach = this.config[id];
          break;
        }
      }
      result.push({
        type: type,
        value: this._privileges[type],
        description: ach ? ach.privilege.description : type,
        icon: ach ? ach.icon : '✨',
        rarity: ach ? ach.rarity : 'common',
      });
    }
    return result;
  }

  /** 获取已解锁成就数量 */
  get unlockedCount() {
    return this._unlocked.length;
  }

  /** 获取成就总数 */
  get totalCount() {
    return Object.keys(this.config).length;
  }

  /** 获取稀有度分布 */
  getRarityDistribution() {
    const dist = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const id of Object.keys(this.config)) {
      const r = this.config[id].rarity;
      if (dist[r] !== undefined) dist[r]++;
    }
    const unlocked = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const id of this._unlocked) {
      const ach = this.config[id];
      if (ach && unlocked[ach.rarity] !== undefined) {
        unlocked[ach.rarity]++;
      }
    }
    return { total: dist, unlocked: unlocked };
  }

  /** 重置所有数据（用于测试） */
  reset() {
    this._unlocked = [];
    this._privileges = {};
    this._tracking = {};
    localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    localStorage.removeItem(STORAGE_KEY_PRIVILEGES);
    localStorage.removeItem(STORAGE_KEY_TRACKING);
  }

  // ============ INTERNAL ============

  _checkCondition(cond, state, achId) {
    if (!cond) return false;
    // Check tracking data first (persistent progress), then state
    const trackingVal = this._tracking[cond.type] || 0;
    const stateVal = state[cond.type] || 0;
    const current = Math.max(trackingVal, stateVal);
    return current >= cond.value;
  }

  _unlock(id, ach) {
    this._unlocked.push(id);
    // Activate privilege
    if (ach.privilege) {
      this._privileges[ach.privilege.type] = ach.privilege.value;
      window.dispatchEvent(new CustomEvent('privilegeActivated', {
        detail: { privilege: ach.privilege, achievement: ach },
      }));
    }
    window.dispatchEvent(new CustomEvent('achievementUnlocked', {
      detail: { achievement: ach },
    }));
  }

  _load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return fallback;
  }

  _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }
}