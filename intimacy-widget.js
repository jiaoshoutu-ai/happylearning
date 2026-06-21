/* ================================================================
   intimacy-widget.js — AI伙伴卡片 UI 渲染器 (ES Module)
   ================================================================
   职责：渲染卡片、打字机效果、进度条动画、升级特效、按钮绑定
   用法：import { renderWidget } from './intimacy-widget.js';
   ================================================================ */

// ── CSS (injected once) ──
let _styleInjected = false;
function injectStyles() {
  if (_styleInjected) return;
  _styleInjected = true;
  const css = `
    .intimacy-widget {
      --bg: var(--bg-mid, #0a0e17);
      --panel: var(--bg-panel, #111827);
      --border: var(--border, #1e293b);
      --text: var(--text, #cbd5e1);
      --text-dim: var(--text-dim, #64748b);
      --accent: var(--accent, #42A5F5);
      font-family: var(--font);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      max-width: 420px;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-panel);
      transition: box-shadow 0.6s;
    }
    .intimacy-widget::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      opacity: 0.4;
    }
    /* scanline overlay */
    .intimacy-widget::after {
      content: '';
      position: absolute; inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
      pointer-events: none; border-radius: var(--radius-lg);
    }

    .iw-header {
      display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
      position: relative; z-index: 1;
    }
    .iw-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--panel);
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                  box-shadow 0.5s, border-color 0.5s;
      position: relative; z-index: 1;
    }
    .iw-avatar.level-up {
      animation: iwBounce 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes iwBounce {
      0% { transform: scale(1); }
      30% { transform: scale(1.35); }
      50% { transform: scale(0.9); }
      70% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .iw-avatar.glow {
      box-shadow: 0 0 30px var(--glow-color, rgba(66,165,245,0.6)),
                  0 0 60px var(--glow-color, rgba(66,165,245,0.3));
      border-color: var(--glow-color, #42A5F5);
    }

    .iw-info { flex: 1; }
    .iw-name {
      font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;
      letter-spacing: 0.1em; margin-bottom: 2px;
    }
    .iw-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 1.05rem; font-weight: 700; color: var(--text);
      padding: 2px 10px; border-radius: 20px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      transition: color 0.4s, border-color 0.4s;
    }
    .iw-badge .badge-dot {
      width: 8px; height: 8px; border-radius: 50%;
      transition: background 0.4s, box-shadow 0.4s;
    }

    .iw-progress-wrap {
      margin-bottom: 18px; position: relative; z-index: 1;
    }
    .iw-progress-label {
      display: flex; justify-content: space-between; margin-bottom: 6px;
      font-size: 0.78rem; color: var(--text-dim);
    }
    .iw-progress-bar {
      height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06);
      overflow: hidden; position: relative;
    }
    .iw-progress-fill {
      height: 100%; border-radius: 3px;
      transition: width 0.7s cubic-bezier(0.25, 0.8, 0.25, 1.2),
                  background 0.4s;
      position: relative;
    }
    .iw-progress-fill::after {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      animation: iwShimmer 2s infinite;
    }
    @keyframes iwShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .iw-dialog {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
      min-height: 52px;
      font-size: 0.9rem; line-height: 1.6; color: var(--text);
      position: relative; z-index: 1;
      transition: border-color 0.4s;
    }
    .iw-dialog .cursor-blink {
      display: inline-block; width: 2px; height: 1em; background: var(--accent);
      margin-left: 1px; vertical-align: text-bottom;
      animation: iwBlink 0.8s step-end infinite;
    }
    @keyframes iwBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .iw-actions {
      display: flex; gap: 10px; flex-wrap: wrap; position: relative; z-index: 1;
    }
    .iw-btn {
      flex: 1; min-width: 90px;
      padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      color: var(--text);
      font-size: 0.82rem; font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      position: relative; overflow: hidden;
      font-family: inherit;
    }
    .iw-btn:hover {
      background: rgba(255,255,255,0.08);
      border-color: var(--accent);
      box-shadow: 0 0 16px rgba(66,165,245,0.15);
      transform: translateY(-1px);
    }
    .iw-btn:active {
      transform: translateY(0);
      background: rgba(255,255,255,0.12);
    }
    .iw-btn .btn-score {
      display: block; font-size: 0.7rem; color: var(--text-dim);
      font-weight: 400; margin-top: 1px;
    }

    .iw-score-pop {
      position: absolute; z-index: 10;
      font-weight: 700; font-size: 1rem;
      pointer-events: none;
      animation: iwScoreFloat 1.2s ease-out forwards;
    }
    @keyframes iwScoreFloat {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-36px) scale(1.3); }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ── Typing effect ──
function typeText(el, text, speed, onComplete) {
  // Clear any ongoing typing
  if (el._typeTimer) clearInterval(el._typeTimer);
  el.textContent = '';
  let i = 0;
  speed = speed || 35;
  el._typeTimer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(el._typeTimer);
      el._typeTimer = null;
      // Add blinking cursor
      const cursor = document.createElement('span');
      cursor.className = 'cursor-blink';
      el.appendChild(cursor);
      if (onComplete) onComplete();
    }
  }, speed);
}

// ── Score pop animation ──
function showScorePop(container, score, color) {
  const pop = document.createElement('span');
  pop.className = 'iw-score-pop';
  pop.textContent = '+' + score;
  pop.style.color = color;
  pop.style.top = '40%';
  pop.style.left = '50%';
  pop.style.transform = 'translate(-50%, 0)';
  container.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}

// ── Main render ──
export function renderWidget(container, manager) {
  injectStyles();
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container) throw new Error('renderWidget: container not found');

  // Build DOM
  container.innerHTML = '';
  container.classList.add('intimacy-widget');

  const level = manager.level;
  const nextScore = manager.nextLevelScore;
  const progress = manager.progressPercent;

  // Header
  const header = document.createElement('div');
  header.className = 'iw-header';
  header.innerHTML = `
    <div class="iw-avatar" id="iw-avatar">${level.emoji}</div>
    <div class="iw-info">
      <div class="iw-name">AI 伙伴</div>
      <div class="iw-badge">
        <span class="badge-dot" style="background:${level.color};box-shadow:0 0 8px ${level.color}"></span>
        <span class="badge-label">Lv.${manager.levelIndex + 1} ${level.label}</span>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Progress
  const progressWrap = document.createElement('div');
  progressWrap.className = 'iw-progress-wrap';
  const prevMax = manager.levelIndex > 0 ? manager.config.levels[manager.levelIndex - 1].maxScore : 0;
  progressWrap.innerHTML = `
    <div class="iw-progress-label">
      <span>亲密度</span>
      <span>${manager.score} / ${nextScore === Infinity ? '∞' : nextScore}</span>
    </div>
    <div class="iw-progress-bar">
      <div class="iw-progress-fill" id="iw-progress-fill"
        style="width:${progress}%;background:${level.color}"></div>
    </div>
  `;
  container.appendChild(progressWrap);

  // Dialog
  const dialog = document.createElement('div');
  dialog.className = 'iw-dialog';
  dialog.id = 'iw-dialog';
  container.appendChild(dialog);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'iw-actions';
  actions.id = 'iw-actions';
  container.appendChild(actions);

  // ── Internal state ──
  let _isTyping = false;
  let _dialogQueue = [];

  function queueDialog(text) {
    _dialogQueue.push(text);
    if (!_isTyping) processQueue();
  }

  function processQueue() {
    if (_dialogQueue.length === 0) { _isTyping = false; return; }
    _isTyping = true;
    const text = _dialogQueue.shift();
    typeText(dialog, text, 32, () => {
      processQueue();
    });
  }

  // ── Refresh UI (called after score changes) ──
  function refreshUI(result) {
    const lvl = manager.level;
    const prog = manager.progressPercent;
    const next = manager.nextLevelScore;

    // Update avatar
    const avatar = document.getElementById('iw-avatar');
    if (avatar) {
      avatar.textContent = lvl.emoji;
      if (result && result.levelChanged) {
        avatar.classList.add('level-up', 'glow');
        avatar.style.setProperty('--glow-color', lvl.color);
        avatar.addEventListener('animationend', () => {
          avatar.classList.remove('level-up', 'glow');
        }, { once: true });
      }
    }

    // Update badge
    const dot = container.querySelector('.badge-dot');
    const label = container.querySelector('.badge-label');
    if (dot) {
      dot.style.background = lvl.color;
      dot.style.boxShadow = `0 0 8px ${lvl.color}`;
    }
    if (label) {
      label.textContent = `Lv.${manager.levelIndex + 1} ${lvl.label}`;
    }
    label.style.color = lvl.color;

    // Update progress
    const fill = document.getElementById('iw-progress-fill');
    if (fill) {
      fill.style.width = prog + '%';
      fill.style.background = lvl.color;
    }
    const progressLabel = container.querySelector('.iw-progress-label span:last-child');
    if (progressLabel) {
      progressLabel.textContent = `${manager.score} / ${next === Infinity ? '∞' : next}`;
    }

    // Update accent
    container.style.setProperty('--accent', lvl.color);
    container.style.boxShadow = `0 0 40px ${lvl.color}22, inset 0 1px 0 rgba(255,255,255,0.03)`;

    // Show score pop
    if (result) {
      showScorePop(container, manager.config.scoreRules[result._actionType] || 5, lvl.color);
    }

    // Queue dialog
    if (result && result.dialog) {
      queueDialog(result.dialog);
    }
  }

  // ── Bind action buttons ──
  function bindActionBtn(label, actionType, score) {
    const btn = document.createElement('button');
    btn.className = 'iw-btn';
    btn.innerHTML = `${label}<span class="btn-score">+${score} 分</span>`;
    btn.addEventListener('click', () => {
      if (_isTyping) {
        // Skip typing animation
        if (dialog._typeTimer) {
          clearInterval(dialog._typeTimer);
          dialog._typeTimer = null;
        }
        const fullText = _dialogQueue.length > 0 ? _dialogQueue[0] : '';
        _dialogQueue = [];
        if (fullText) {
          dialog.textContent = fullText;
          const cursor = document.createElement('span');
          cursor.className = 'cursor-blink';
          dialog.appendChild(cursor);
        }
        _isTyping = false;
      }
      const result = manager.addScore(actionType);
      result._actionType = actionType;
      refreshUI(result);
    });
    actions.appendChild(btn);
  }

  const rules = manager.config.scoreRules;
  bindActionBtn('🧠 深度回答', 'deepAnswer', rules.deepAnswer);
  bindActionBtn('🔍 重新审视', 'revisit', rules.revisit);
  bindActionBtn('📋 导出护照', 'passport', rules.passport);

  // ── Initial greeting ──
  queueDialog(manager.getDialog('greeting'));

  // Initial render
  refreshUI(null);

  // ── Listen for level-up events ──
  window.addEventListener('intimacyLevelUp', (e) => {
    const { oldLevel, newLevel } = e.detail;
    // Extra glow burst on level up
    container.style.boxShadow = `0 0 60px ${newLevel.color}44, 0 0 120px ${newLevel.color}22`;
    setTimeout(() => {
      container.style.boxShadow = `0 0 40px ${newLevel.color}22, inset 0 1px 0 rgba(255,255,255,0.03)`;
    }, 1200);
  });

  // Return API
  return {
    container,
    refreshUI,
    queueDialog,
    get manager() { return manager; },
  };
}