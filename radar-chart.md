# HexagonRadar — 六边形战士雷达图模块

> 原生 Canvas 实现，零外部依赖，适合作为游戏化 UI 的基础模块。

## 架构设计

```
radar-chart-config.json   ← 静态元数据：维度的"名字、颜色、是什么"
localStorage              ← 运行时数据：玩家当前分值（自动存取）
radar-chart.js            ← 渲染引擎，不关心数据来源
```

- **JSON 配置文件**：只定义"这个六边形是什么、叫什么"，不存储游戏进度
- **localStorage**：存储玩家的实际分值，每次训练后自动保存，刷新页面后自动恢复

## 快速开始

```html
<!-- 1. 引入模块 -->
<script src="radar-chart.js"></script>

<canvas id="radar"></canvas>

<script>
  (async function () {
    // 2. 从 JSON 加载静态配置
    var opts = await HexagonRadar.loadConfig('radar-chart-config.json');

    // 3. 创建实例（runtime 值自动从 localStorage 恢复）
    var radar = new HexagonRadar(document.getElementById('radar'), opts);

    // 4. 绑定 UI 控件
    radar.bindTrainButton(
      document.getElementById('trainBtn'),
      document.getElementById('motivation')
    );

    // 5. 首次访问播放动画，已有存档则跳过
    if (!localStorage.getItem(radar.opts.storageKey)) {
      radar.startInitialAnimation();
    }
  })();
</script>
```

## JSON 配置文件格式

文件只定义**静态元数据**，不包含运行时产生的游戏分值：

```json
{
  "title": "思辨能力雷达图",
  "subtitle": "⚔️ 六边形战士成长日记",
  "maxValue": 100,
  "dimensions": [
    { "id": "logic",       "label": "逻辑力", "color": "#4FC3F7", "initialValue": 40 },
    { "id": "empathy",     "label": "共情力", "color": "#81C784", "initialValue": 70 },
    { "id": "evidence",    "label": "证据力", "color": "#FFB74D", "initialValue": 55 },
    { "id": "foresight",   "label": "远见力", "color": "#CE93D8", "initialValue": 30 },
    { "id": "resilience",  "label": "抗挫力", "color": "#F06292", "initialValue": 85 },
    { "id": "perspective", "label": "换位力", "color": "#4DD0E1", "initialValue": 60 }
  ],
  "previousValues": [35, 65, 50, 25, 80, 55]
}
```

| 字段 | 说明 |
|------|------|
| `title` | 页面标题（可选） |
| `subtitle` | 副标题（可选） |
| `maxValue` | 每个维度的最大值，默认 100 |
| `dimensions[].id` | 唯一标识符 |
| `dimensions[].label` | 显示名称 |
| `dimensions[].color` | 顶点颜色 |
| `dimensions[].initialValue` | 首次访问时的初始值（0–maxValue） |
| `previousValues` | 首次访问时的对比基准值（可选） |

## localStorage 数据格式

运行时数据以 `storageKey`（默认 `hexagon-radar-values`）为键存储在 localStorage：

```json
{
  "currentValues": [45, 73, 60, 35, 88, 65],
  "previousValues": [40, 70, 55, 30, 85, 60]
}
```

每次训练动画完成后自动保存，无需手动调用。

## 构造函数选项

```js
new HexagonRadar(canvas, {
  // ── 必填 ──
  dimensions: [
    {
      id: 'logic',       // 唯一标识
      label: '逻辑力',    // 显示名称
      value: 40,         // 初始值 (0–maxValue)
      color: '#4FC3F7',  // 顶点颜色
    },
    // ... 至少 3 个维度
  ],

  // ── 可选 ──
  previousValues: [35, 65, 50, 25, 80, 55], // 上一次数据，用于差值对比
  maxValue: 100,                              // 最大值，默认 100
  animationDuration: 1.8,                     // 动画时长（秒），默认 1.8
  petalStagger: 0.06,                         // 花瓣依次绽放间隔（秒），默认 0.06
  showGrid: true,                             // 显示背景网格
  showLabels: true,                           // 显示维度标签
  showTooltip: true,                          // 鼠标悬停显示数值
  starCount: 120,                             // 背景星星数量
  canvasWidth: 600,                           // 画布内部分辨率
  canvasHeight: 600,

  // ── 自定义文案 ──
  messages: {
    single: ['🔥 厉害！{dim}大幅提升！', ...],
    multi:  ['⚡ 太棒了！{dims}同时突破！', ...],
    badge: '🎉 所有维度已满级！',
    noGrowth: '💤 这次没有明显成长',
    initial: '✨ 六边形勋章正在成型...',
  },

  // ── 回调 ──
  callbacks: {
    onGrowth: function(growthMap, topLabels) {
      // growthMap: { logic: 5, empathy: 3, ... }
      // topLabels: ['逻辑力'] — 增长最快的维度标签（可能有多个并列）
    },
    onBadge: function() {
      // 所有维度达到 maxValue 时触发
    },
    onAnimationComplete: function(values) {
      // values: 当前所有维度数值数组
    },
    onMotivation: function(message) {
      // message: 激励语字符串
    },
  },
});
```

## 公开方法

### `radar.train()`

触发一次随机训练。每个维度随机增长 1–8，自动播放动画并返回结果。

```js
var result = radar.train();
// result = {
//   growthMap: { logic: 5, empathy: 3, ... },
//   targetValues: [45, 73, ...],
//   topLabels: ['逻辑力'],
//   message: '🔥 厉害！逻辑力大幅提升，继续保持！'
// }
```

如果正在动画中、或已满级/徽章模式，返回 `null`。

### `radar.setValues(values, animate)`

直接设置数值，可选择是否播放动画。

```js
// 带动画过渡
radar.setValues([80, 90, 70, 60, 95, 85], true);

// 立即生效（无动画）
radar.setValues([80, 90, 70, 60, 95, 85], false);
```

### `radar.getValues()`

返回当前各维度数值数组。

```js
var values = radar.getValues(); // [45, 73, 60, 35, 88, 65]
```

### `radar.getDimensions()`

返回维度元数据（深拷贝）。

```js
var dims = radar.getDimensions();
// [{ id: 'logic', label: '逻辑力', value: 45, color: '#4FC3F7' }, ...]
```

### `radar.isBadge()`

返回是否已进入徽章模式（所有维度满级）。

```js
if (radar.isBadge()) {
  console.log('六边形战士已达成！');
}
```

### `radar.startInitialAnimation(message)`

播放入场动画（从中心绽放）。通常在页面加载时调用一次。

```js
radar.startInitialAnimation('✨ 你的六边形勋章正在成型...');
```

### `radar.bindTrainButton(btnEl, motivationEl, opts)`

快捷绑定训练按钮 + 激励语元素，自动处理按钮状态和文案更新。

```js
radar.bindTrainButton(
  document.getElementById('trainBtn'),
  document.getElementById('motivation'),
  {
    badgeText: '🏆 六边形战士已达成',
    badgeBg: 'linear-gradient(135deg, #FFD700 0%, #FF6D00 100%)',
  }
);
// 按钮点击 → 自动调用 radar.train()
// 满级后 → 按钮文字自动变为 badgeText
// 每次训练 → 激励语自动更新到 motivationEl
```

### `radar.destroy()`

停止动画循环，清理资源。

```js
radar.destroy();
```

### `radar.save()`

手动保存当前 runtime 值到 localStorage。通常不需要手动调用——每次动画完成后自动保存。

```js
radar.save();
```

### `radar.reset(animate)`

重置所有维度为配置中的初始值，清除 localStorage 存档。

```js
// 立即重置（无动画）
radar.reset(false);

// 从零播放入场动画
radar.reset(true);
```

### `HexagonRadar.loadConfig(url)` (静态方法)

从 JSON 文件加载静态配置，返回 Promise。

```js
var opts = await HexagonRadar.loadConfig('radar-chart-config.json');
var radar = new HexagonRadar(canvas, opts);
```

## 完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body { background: #0B0F19; }
  canvas { display: block; margin: 0 auto; }
</style>
</head>
<body>
<canvas id="radar" width="600" height="600"></canvas>
<button id="trainBtn">⚔️ 模拟修炼一节课</button>
<div id="motivation"></div>

<script src="radar-chart.js"></script>
<script>
  var radar = new HexagonRadar(document.getElementById('radar'), {
    dimensions: [
      { id: 'logic',      label: '逻辑力', value: 40, color: '#4FC3F7' },
      { id: 'empathy',    label: '共情力', value: 70, color: '#81C784' },
      { id: 'evidence',   label: '证据力', value: 55, color: '#FFB74D' },
      { id: 'foresight',  label: '远见力', value: 30, color: '#CE93D8' },
      { id: 'resilience', label: '抗挫力', value: 85, color: '#F06292' },
      { id: 'perspective',label: '换位力', value: 60, color: '#4DD0E1' },
    ],
    previousValues: [35, 65, 50, 25, 80, 55],
    callbacks: {
      onGrowth: function(growthMap, topLabels) {
        console.log('Growth:', growthMap);
      },
      onBadge: function() {
        console.log('🏆 六边形战士达成！');
      },
    },
  });

  radar.bindTrainButton(
    document.getElementById('trainBtn'),
    document.getElementById('motivation')
  );

  radar.startInitialAnimation();
</script>
</body>
</html>
```

## 动画说明

| 阶段 | 效果 | 时长 |
|------|------|------|
| 花瓣绽放 | 各维度从中心依次向外绽放，配合轻微旋转 | ~1.5s/花瓣，总 ~1.8s |
| 金色脉冲 | 增长维度顶点触发金色光环扩散 | ~0.7s |
| 粒子特效 | 绽放粒子 + 成长顶点闪烁粒子 | ~1.0s |
| 徽章模式 | 满级后六边形变为发光徽章，旋转光束扫边 | 持续 |

## 浏览器兼容性

- Chrome 51+
- Firefox 54+
- Safari 10+
- Edge 15+
- 移动端 Safari / Chrome

依赖 `Canvas 2D`、`requestAnimationFrame`、`devicePixelRatio`，均为现代浏览器标准 API。