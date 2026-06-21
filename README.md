# IntimacyManager — AI伙伴亲密度模块

> 养成系AI伙伴交互模块，包含亲密度等级系统、对话风格切换、积分获取机制。
> 原生 ES Module，零外部依赖，即插即用。

## 快速开始

```html
<script type="module">
  import { IntimacyManager } from './intimacy-module.js';
  import { renderWidget } from './intimacy-widget.js';

  const manager = new IntimacyManager({
    nickname: '学霸',
  });

  const widget = renderWidget('#myContainer', manager);

  // 外部调用积分操作
  manager.addScore('deepAnswer');  // 深度回答 +5
  manager.addScore('revisit');     // 重新审视 +2
  manager.addScore('passport');    // 导出护照 +10
</script>
```

> **注意**：ES Module 需要通过 HTTP 服务器访问（`python -m http.server` 或 VS Code Live Server），`file://` 协议下 Chrome 会阻止模块加载。

## 等级系统

| 等级 | 积分 | 称呼 | 表情 | 对话风格 |
|------|------|------|------|----------|
| Lv.1 陌生人 | 0–100 | "用户" | 🧊 | 机械、中性，无表情符号 |
| Lv.2 学习搭子 | 101–300 | "同学" | 😊 | 颜文字 + 语气词"呢~""哦~" |
| Lv.3 思维宿敌 | 301+ | 自定义昵称 | 😏 | 毒舌吐槽 + 真心夸赞，语气犀利 |

## API 参考

### `new IntimacyManager(customConfig)`

创建亲密度管理器实例。`customConfig` 与默认配置深度合并。

```js
const manager = new IntimacyManager({
  nickname: '小明',          // Lv.3 自定义昵称
  levels: [ ... ],           // 覆盖等级定义
  scoreRules: {              // 覆盖积分规则
    deepAnswer: 5,
    revisit: 2,
    passport: 10,
  },
  dialogs: { ... },          // 覆盖对话文案
});
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `manager.score` | `number` | 当前积分 |
| `manager.levelIndex` | `number` | 当前等级索引 (0-based) |
| `manager.level` | `object` | 当前等级对象 `{id, label, maxScore, emoji, color}` |
| `manager.nextLevelScore` | `number` | 下一级所需积分上限 |
| `manager.progressPercent` | `number` | 当前等级进度百分比 (0–100) |

### 方法

#### `manager.addScore(actionType)`

增加积分并返回结果对象。

```js
const result = manager.addScore('deepAnswer');
// {
//   newScore: 105,
//   levelChanged: true,
//   oldLevel: { id: 'stranger', label: '陌生人', ... },
//   newLevel: { id: 'buddy', label: '学习搭子', ... },
//   dialog: '恭喜升级！你已经是个厉害的学习搭子了！🎉'
// }
```

| actionType | 积分 | 说明 |
|------------|------|------|
| `'deepAnswer'` | +5 | 深度回答 |
| `'revisit'` | +2 | 重新审视 |
| `'passport'` | +10 | 导出护照 |

#### `manager.getDialog(type)`

获取指定类型的对话文本（不增加积分）。

```js
manager.getDialog('greeting');   // 问候语
manager.getDialog('slacking');   // 偷懒提示（仅 Lv.3）
manager.getDialog('wrongAnswer'); // 答错提示
```

#### `manager.reset()`

重置所有数据并清除 localStorage。

#### `manager.getRawData()`

返回原始存储数据 `{ score, prevScore }`。

### `renderWidget(container, manager)`

渲染 AI 伙伴卡片 UI。

```js
const widget = renderWidget('#myContainer', manager);
// 返回 { container, refreshUI, queueDialog, manager }
```

## 自定义事件

### `intimacyLevelUp`

等级变化时在 `window` 上派发。

```js
window.addEventListener('intimacyLevelUp', (e) => {
  const { oldLevel, newLevel, score } = e.detail;
  console.log(`升级！${oldLevel.label} → ${newLevel.label}`);
  // 播放庆祝特效、解锁新功能等
});
```

## 配置结构

完整默认配置见 `intimacy-module.js` 中的 `DEFAULT_CONFIG`：

```js
{
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
  nickname: '学霸',
  dialogs: {
    stranger: { greeting: [...], deepAnswer: [...], ... },
    buddy:    { greeting: [...], deepAnswer: [...], ... },
    rival:    { greeting: [...], deepAnswer: [...], ... },
  },
}
```

## 数据持久化

- 积分和等级通过 `localStorage` 自动保存（key: `intimacy_data`）
- 页面刷新后自动恢复
- 调用 `manager.reset()` 清除存储

## 集成到游戏

```js
// 在游戏的答题系统中
function onUserDeepAnswer() {
  const result = manager.addScore('deepAnswer');
  if (result.levelChanged) {
    // 触发升级特效、解锁新功能
    gameUI.showLevelUpCelebration(result.newLevel);
  }
  // 显示 AI 对话
  gameUI.showDialog(result.dialog);
}

// 在游戏关卡中，答错时
function onWrongAnswer() {
  gameUI.showDialog(manager.getDialog('wrongAnswer'));
}

// 玩家偷懒检测
function onIdleDetection() {
  if (manager.level.id === 'rival') {
    gameUI.showDialog(manager.getDialog('slacking'));
  }
}
```

## 文件结构

```
intimacy-module.js   ← 核心逻辑（积分、等级、对话、存储、事件）
intimacy-widget.js   ← UI 渲染器（卡片、打字机、进度条、升级动画）
demo.html            ← 演示页面（完整功能展示 + 测试按钮）
README.md            ← 本文档
```