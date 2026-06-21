# AchievementManager — 成就博物馆模块

> 成就与特权系统，包含成就定义、解锁逻辑、特权激活、数据持久化。
> 原生 ES Module，零外部依赖，即插即用。

## 快速开始

```html
<script src="theme.js"></script>
<script src="achievement-config.js"></script>
<script type="module">
  import { AchievementManager } from './achievement-manager.js';
  import { renderMuseum } from './achievement-widget.js';

  const manager = new AchievementManager();
  const widget = renderMuseum('#myContainer', manager);

  // 模拟游戏进度
  manager.incrementTracking('levelComplete', 1);
  manager.checkAll({ levelComplete: 1 });
</script>
```

## 架构设计

```
achievement-config.js     ← 静态元数据（成就定义、条件、特权、图标）
achievement-manager.js    ← 核心逻辑（检查、解锁、存储、事件）
achievement-widget.js     ← UI 渲染器（博物馆网格 + 特权面板）
localStorage              ← 运行时数据（已解锁列表、进度、特权）
```

## 10 个成就一览

| ID | 名称 | 条件 | 特权 | 稀有度 |
|----|------|------|------|--------|
| `first_awaken` | 初次觉醒 🌱 | 完成第 1 关 | 视频 0.5 倍速播放 | 普通 |
| `persistence_3` | 三日之约 📅 | 连续 3 天登录 | 每日首次学习 +5 积分 | 稀有 |
| `empathy_master` | 端水大师 ⚖️ | 连续 3 次完美复述 | 免盲盒卡 | 稀有 |
| `time_traveler` | 时空旅人 🔮 | 提出 5 个假设 | AI 预判功能 | 史诗 |
| `deep_thinker` | 深度思考者 🧠 | 深度回答 10 次 | 思维导出功能 | 稀有 |
| `logical_sharp` | 逻辑利刃 ⚔️ | 逻辑修正 3 次 | 逻辑护盾（少扣 50%） | 史诗 |
| `evidence_hunter` | 证据猎人 🔍 | 引用细节 20 次 | 1.5 倍速回看 | 稀有 |
| `perspective_king` | 视角之王 👑 | 强制换位 10 次 | 上帝视角（3 种立场） | 传说 |
| `passport_collector` | 护照收藏家 🎫 | 导出护照 5 次 | 皮肤碎片 | 史诗 |
| `zen_master` | 禅定大师 🧘 | 连续答对 10 次 | 免打扰模式 | 传说 |

## 成就配置结构

每个成就的定义格式：

```js
{
  id: 'first_awaken',                    // 唯一标识
  name: '初次觉醒',                       // 显示名称
  description: '完成第1关',               // 解锁条件描述
  unlockCondition: {
    type: 'levelComplete',               // 条件类型（对应 tracking key）
    value: 1                              // 目标值
  },
  privilege: {
    type: 'video_speed',                 // 特权类型（全局唯一）
    value: 0.5,                          // 特权值（布尔或数字）
    description: '解锁视频 0.5 倍速播放'   // 特权说明
  },
  icon: '🌱',                            // 图标
  rarity: 'common'                        // 稀有度：common | rare | epic | legendary
}
```

## API 参考

### `new AchievementManager(customConfig)`

创建成就管理器。`customConfig` 与默认配置合并（可覆盖或扩展成就）。

```js
const manager = new AchievementManager({
  'my_custom_ach': {
    id: 'my_custom_ach',
    name: '自定义成就',
    description: '完成特殊任务',
    unlockCondition: { type: 'customTask', value: 5 },
    privilege: { type: 'custom_power', value: true, description: '自定义特权' },
    icon: '🎯',
    rarity: 'epic',
  },
});
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `manager.unlockedCount` | `number` | 已解锁成就数量 |
| `manager.totalCount` | `number` | 成就总数 |
| `manager.config` | `object` | 当前成就配置（只读） |

### 方法

#### `manager.checkAll(state)`

检查所有成就，自动解锁满足条件的。返回本次新解锁的成就数组。

```js
const gameState = {
  levelComplete: 1,
  streakDays: 3,
  hypotheticalCount: 5,
};

const newlyUnlocked = manager.checkAll(gameState);
// [{ id: 'first_awaken', name: '初次觉醒', ... }, ...]
```

#### `manager.incrementTracking(type, delta)`

递增追踪进度。`delta` 默认为 1。

```js
// 玩家引用了一次视频细节
manager.incrementTracking('evidenceCount', 1);

// 然后检查成就
manager.checkAll({ evidenceCount: manager._tracking.evidenceCount });
```

#### `manager.updateTracking(type, value)`

直接设置追踪进度值（覆盖而非递增）。

```js
manager.updateTracking('streakDays', 3);
```

#### `manager.getUnlocked()`

返回已解锁成就 ID 数组。

```js
const ids = manager.getUnlocked(); // ['first_awaken', 'empathy_master']
```

#### `manager.getProgress()`

返回所有成就的进度信息。

```js
const progress = manager.getProgress();
// {
//   first_awaken: { name: '初次觉醒', current: 1, target: 1, unlocked: true, ... },
//   evidence_hunter: { name: '证据猎人', current: 12, target: 20, unlocked: false, ... },
//   ...
// }
```

#### `manager.getAchievementProgress(id)`

获取单个成就的进度。

```js
const p = manager.getAchievementProgress('evidence_hunter');
// { name: '证据猎人', current: 12, target: 20, unlocked: false, ... }
```

#### `manager.hasPrivilege(type)`

查询是否拥有某特权。

```js
if (manager.hasPrivilege('skip_blindbox')) {
  // 显示"跳过盲盒"按钮
}
```

#### `manager.getPrivilegeValue(type)`

获取特权具体值。

```js
const speed = manager.getPrivilegeValue('video_speed'); // 0.5
const hasGodView = manager.getPrivilegeValue('god_view'); // true
```

#### `manager.getPrivileges()`

获取所有已拥有特权列表。

```js
const privs = manager.getPrivileges();
// [{ type: 'video_speed', value: 0.5, description: '...', icon: '🌱', rarity: 'common' }, ...]
```

#### `manager.getRarityDistribution()`

获取稀有度分布统计。

```js
const dist = manager.getRarityDistribution();
// {
//   total: { common: 1, rare: 4, epic: 3, legendary: 2 },
//   unlocked: { common: 1, rare: 2, epic: 0, legendary: 0 }
// }
```

#### `manager.reset()`

重置所有数据，清除 localStorage。用于测试。

## 自定义事件

### `achievementUnlocked`

成就解锁时在 `window` 上派发。

```js
window.addEventListener('achievementUnlocked', (e) => {
  const { achievement } = e.detail;
  // achievement: { id, name, description, unlockCondition, privilege, icon, rarity }
  showCelebration(achievement.name);
});
```

### `privilegeActivated`

特权首次激活时在 `window` 上派发。

```js
window.addEventListener('privilegeActivated', (e) => {
  const { privilege, achievement } = e.detail;
  // privilege: { type, value, description }
  console.log(`新特权解锁：${privilege.description}`);
});
```

## UI 渲染

### `renderMuseum(container, manager)`

渲染完整的成就博物馆（统计栏 + 成就网格 + 特权面板）。

```js
import { renderMuseum } from './achievement-widget.js';

const widget = renderMuseum('#museumContainer', manager);
// 返回 { container, refreshStats }
```

### `renderPrivilegePanel(container, manager)`

单独渲染特权面板。

```js
import { renderPrivilegePanel } from './achievement-widget.js';

renderPrivilegePanel('#sidebarContainer', manager);
```

## localStorage 数据格式

| Key | 格式 | 示例 |
|-----|------|------|
| `achievements_unlocked` | `string[]` | `["first_awaken","empathy_master"]` |
| `privileges_owned` | `object` | `{"video_speed":0.5,"skip_blindbox":true}` |
| `achievement_tracking` | `object` | `{"evidenceCount":15,"hypotheticalCount":3}` |

## 集成到游戏

```js
// 游戏初始化
const achievementMgr = new AchievementManager();
const museum = renderMuseum('#museumTab', achievementMgr);

// 关卡完成时
function onLevelComplete(level) {
  achievementMgr.incrementTracking('levelComplete', 1);
  const state = { levelComplete: achievementMgr._tracking.levelComplete };
  const unlocked = achievementMgr.checkAll(state);
  unlocked.forEach(ach => showUnlockNotification(ach));
}

// 答题时
function onDeepAnswer() {
  achievementMgr.incrementTracking('deepAnswerCount', 1);
  achievementMgr.checkAll({
    deepAnswerCount: achievementMgr._tracking.deepAnswerCount,
  });
}

// 特权查询
function onWrongAnswer(penalty) {
  if (achievementMgr.hasPrivilege('logic_shield')) {
    penalty *= achievementMgr.getPrivilegeValue('logic_shield'); // 50% off
  }
  applyPenalty(penalty);
}

// 视频播放
function getPlaybackSpeed() {
  const speed = achievementMgr.getPrivilegeValue('video_speed');
  return speed || 1.0;
}
```

## 自定义成就教程

### 1. 定义成就

```js
const customAchievements = {
  'speed_demon': {
    id: 'speed_demon',
    name: '闪电侠',
    description: '在 30 秒内完成一关',
    unlockCondition: { type: 'speedRun', value: 1 },
    privilege: { type: 'turbo_mode', value: true, description: '解锁 2 倍速闯关' },
    icon: '⚡',
    rarity: 'epic',
  },
};
```

### 2. 传入管理器

```js
const manager = new AchievementManager(customAchievements);
// 默认 10 个成就 + 自定义成就 = 11 个
```

### 3. 追踪进度

```js
// 玩家完成速通时
manager.incrementTracking('speedRun', 1);
manager.checkAll({ speedRun: manager._tracking.speedRun });
```

### 4. 查询特权

```js
if (manager.hasPrivilege('turbo_mode')) {
  gameSpeed = 2.0;
}
```

## 稀有度配置

| 稀有度 | 颜色 | 标签 |
|--------|------|------|
| `common` | `#9E9E9E` | 普通 |
| `rare` | `#42A5F5` | 稀有 |
| `epic` | `#AB47BC` | 史诗 |
| `legendary` | `#FFD700` | 传说 |

可在 `achievement-config.js` 的 `RARITY_CONFIG` 中自定义。

## 文件结构

```
achievement-config.js    ← 成就定义（10 个默认成就 + 稀有度配置）
achievement-manager.js   ← 核心逻辑（检查、解锁、存储、事件）
achievement-widget.js    ← UI 渲染器（博物馆网格 + 特权面板 + 解锁动画）
achievement-demo.html    ← 演示页面（10 个模拟按钮 + 完整交互）
achievement.md           ← 本文档
```