/* ================================================================
   achievement-widget.js — 成就博物馆 · UI 渲染器
   ================================================================
   导出 renderMuseum(container, manager) 和 renderPrivilegePanel(container, manager)
   用法：import { renderMuseum, renderPrivilegePanel } from './achievement-widget.js';
   ================================================================ */

let _styleInjected = false;
function injectStyles() {
  if (_styleInjected) return;
  _styleInjected = true;
  const css = `
    .ach-museum {
      font-family: var(--font);
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    /* ── Stats bar ── */
    .ach-stats {
      display: flex; gap: 16px; flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .ach-stat-card {
      flex: 1; min-width: 120px;
      background: var(--bg-panel, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: var(--radius, 12px);
      padding: 16px;
      text-align: center;
    }
    .ach-stat-card .stat-num {
      font-size: 2rem; font-weight: 800;
      color: var(--accent, #42A5F5);
    }
    .ach-stat-card .stat-label {
      font-size: 0.75rem; color: var(--text-dim, #64748b);
      text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;
    }

    /* ── Rarity dots ── */
    .ach-rarity-dots {
      display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
    }
    .ach-rarity-dot {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.78rem; color: var(--text-dim, #64748b);
    }
    .ach-rarity-dot .dot {
      width: 10px; height: 10px; border-radius: 50%;
      display: inline-block;
    }
    .ach-rarity-dot .dot.common    { background: #9E9E9E; }
    .ach-rarity-dot .dot.rare      { background: #42A5F5; }
    .ach-rarity-dot .dot.epic      { background: #AB47BC; }
    .ach-rarity-dot .dot.legendary { background: #FFD700; }

    /* ── Achievement grid ── */
    .ach-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }

    .ach-card {
      background: var(--bg-panel, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: var(--radius, 12px);
      padding: 18px 14px;
      text-align: center;
      position: relative;
      transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
      cursor: default;
      perspective: 600px;
    }
    .ach-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .ach-card.locked {
      opacity: 0.55;
      filter: grayscale(0.7);
    }
    .ach-card.locked:hover {
      opacity: 0.75;
    }
    .ach-card.unlocked {
      border-color: var(--rarity-color, #42A5F5);
      box-shadow: 0 0 16px var(--rarity-glow, rgba(66,165,245,0.2));
    }

    /* Card inner for flip */
    .ach-card-inner {
      position: relative;
    }

    .ach-icon {
      font-size: 2.2rem;
      margin-bottom: 8px;
      display: block;
    }
    .ach-card.locked .ach-icon {
      filter: grayscale(1);
    }

    .ach-name {
      font-size: 0.88rem; font-weight: 700;
      color: var(--text, #cbd5e1);
      margin-bottom: 4px;
    }
    .ach-desc {
      font-size: 0.72rem; color: var(--text-dim, #64748b);
      margin-bottom: 10px; line-height: 1.4;
    }

    .ach-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--rarity-color, #9E9E9E);
      color: #fff;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
    }

    .ach-progress {
      height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.08);
      overflow: hidden;
      margin-top: 6px;
    }
    .ach-progress-fill {
      height: 100%; border-radius: 2px;
      background: var(--rarity-color, #42A5F5);
      transition: width 0.5s ease;
    }
    .ach-progress-label {
      font-size: 0.68rem; color: var(--text-dim, #64748b);
      margin-top: 4px;
    }

    .ach-check {
      position: absolute; top: 8px; right: 10px;
      font-size: 1.1rem;
    }
    .ach-lock {
      position: absolute; top: 8px; right: 10px;
      font-size: 1rem; opacity: 0.5;
    }

    /* ── Unlock animation ── */
    .ach-card.unlocking {
      animation: achFlip 0.8s ease-out;
    }
    @keyframes achFlip {
      0%   { transform: perspective(600px) rotateY(0deg); }
      40%  { transform: perspective(600px) rotateY(180deg); }
      100% { transform: perspective(600px) rotateY(360deg); }
    }
    .ach-card.glow-pulse {
      animation: achGlow 1.2s ease-out;
    }
    @keyframes achGlow {
      0%   { box-shadow: 0 0 0 var(--rarity-glow); }
      40%  { box-shadow: 0 0 40px var(--rarity-glow), 0 0 80px var(--rarity-glow); }
      100% { box-shadow: 0 0 8px var(--rarity-glow); }
    }

    /* ── Confetti ── */
    .ach-confetti {
      position: fixed; pointer-events: none; z-index: 999;
      font-size: 1.5rem;
      animation: confettiFall 1.6s ease-out forwards;
    }
    @keyframes confettiFall {
      0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0); }
    }

    /* ── Privilege panel ── */
    .ach-privileges {
      background: var(--bg-panel, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: var(--radius, 12px);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .ach-privileges::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent, #42A5F5), transparent);
      opacity: 0.4;
    }
    .ach-privileges h3 {
      font-size: 1rem; color: var(--text, #cbd5e1);
      margin-bottom: 14px; text-align: center;
    }
    .priv-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    .priv-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border, #1e293b);
      transition: border-color 0.3s;
    }
    .priv-item.owned {
      border-color: var(--rarity-color, #42A5F5);
    }
    .priv-item .priv-icon {
      font-size: 1.3rem; flex-shrink: 0;
    }
    .priv-item .priv-info {
      flex: 1;
    }
    .priv-item .priv-name {
      font-size: 0.82rem; font-weight: 600; color: var(--text, #cbd5e1);
    }
    .priv-item .priv-desc {
      font-size: 0.7rem; color: var(--text-dim, #64748b);
      margin-top: 2px;
    }
    .priv-item .priv-status {
      font-size: 0.7rem; font-weight: 700;
      padding: 2px 8px; border-radius: 8px;
    }
    .priv-item .priv-status.active {
      background: rgba(76, 175, 80, 0.2); color: #4CAF50;
    }
    .priv-item .priv-status.locked {
      background: rgba(255,255,255,0.05); color: var(--text-dim, #64748b);
    }

    /* ── Section title ── */
    .ach-section-title {
      font-size: 1.1rem; font-weight: 700;
      color: var(--text, #cbd5e1);
      margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .ach-section-title::after {
      content: '';
      flex: 1; height: 1px;
      background: var(--border, #1e293b);
    }

    @media (max-width: 600px) {
      .ach-grid { grid-template-columns: repeat(2, 1fr); }
      .priv-list { grid-template-columns: 1fr; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function spawnConfetti(x, y, color) {
  const emojis = ['🎉', '✨', '🌟', '💫', '⭐', '🎊'];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('span');
    el.className = 'ach-confetti';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
    el.style.setProperty('--dy', -(Math.random() * 160 + 40) + 'px');
    el.style.setProperty('--rot', (Math.random() - 0.5) * 720 + 'deg');
    el.style.animationDelay = Math.random() * 0.3 + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── Rarity helpers ──
const RARITY = {
  common:    { label: '普通', color: '#9E9E9E', glow: 'rgba(158,158,158,0.3)' },
  rare:      { label: '稀有', color: '#42A5F5', glow: 'rgba(66,165,245,0.3)' },
  epic:      { label: '史诗', color: '#AB47BC', glow: 'rgba(171,71,188,0.3)' },
  legendary: { label: '传说', color: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
};

// ── Main render ──
export function renderMuseum(container, manager) {
  injectStyles();
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container) throw new Error('renderMuseum: container not found');

  container.innerHTML = '';
  container.classList.add('ach-museum');

  const progress = manager.getProgress();
  const dist = manager.getRarityDistribution();
  const unlockedCount = manager.unlockedCount;
  const totalCount = manager.totalCount;

  // ── Stats bar ──
  const stats = document.createElement('div');
  stats.className = 'ach-stats';
  stats.innerHTML = `
    <div class="ach-stat-card">
      <div class="stat-num">${unlockedCount}<span style="font-size:1rem;color:var(--text-dim)"> / ${totalCount}</span></div>
      <div class="stat-label">已解锁成就</div>
    </div>
    <div class="ach-stat-card">
      <div class="ach-rarity-dots">
        ${['common','rare','epic','legendary'].map(r =>
          `<span class="ach-rarity-dot"><span class="dot ${r}"></span> ${dist.unlocked[r]}/${dist.total[r]}</span>`
        ).join('')}
      </div>
      <div class="stat-label">稀有度分布</div>
    </div>
  `;
  container.appendChild(stats);

  // ── Achievement grid ──
  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'ach-section-title';
  sectionTitle.textContent = '🏛️ 成就博物馆';
  container.appendChild(sectionTitle);

  const grid = document.createElement('div');
  grid.className = 'ach-grid';
  grid.id = 'ach-grid';

  const allIds = Object.keys(manager.config);
  for (const id of allIds) {
    const ach = manager.config[id];
    const prog = progress[id];
    const unlocked = prog.unlocked;
    const r = RARITY[ach.rarity] || RARITY.common;

    const card = document.createElement('div');
    card.className = 'ach-card ' + (unlocked ? 'unlocked' : 'locked');
    card.id = 'ach-card-' + id;
    card.style.setProperty('--rarity-color', r.color);
    card.style.setProperty('--rarity-glow', r.glow);

    card.innerHTML = `
      <div class="ach-card-inner">
        <span class="ach-icon">${ach.icon}</span>
        <span class="${unlocked ? 'ach-check' : 'ach-lock'}">${unlocked ? '✅' : '🔒'}</span>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.description}</div>
        <span class="ach-badge">${r.label}</span>
        ${unlocked ? '' : `
          <div class="ach-progress">
            <div class="ach-progress-fill" style="width:${(prog.current / prog.target) * 100}%"></div>
          </div>
          <div class="ach-progress-label">${prog.current} / ${prog.target}</div>
        `}
      </div>
    `;
    grid.appendChild(card);
  }
  container.appendChild(grid);

  // ── Privilege section ──
  renderPrivilegePanel(container, manager);

  // ── Listen for unlock events ──
  window.addEventListener('achievementUnlocked', function onUnlock(e) {
    const ach = e.detail.achievement;
    const card = document.getElementById('ach-card-' + ach.id);
    if (!card) return;

    const r = RARITY[ach.rarity] || RARITY.common;
    card.classList.remove('locked');
    card.classList.add('unlocked', 'unlocking', 'glow-pulse');
    card.style.setProperty('--rarity-color', r.color);
    card.style.setProperty('--rarity-glow', r.glow);

    // Update card content
    const checkEl = card.querySelector('.ach-lock');
    if (checkEl) {
      checkEl.className = 'ach-check';
      checkEl.textContent = '✅';
    }
    // Remove progress bar
    const progEl = card.querySelector('.ach-progress');
    if (progEl) progEl.remove();
    const progLabel = card.querySelector('.ach-progress-label');
    if (progLabel) progLabel.remove();

    // Confetti
    const rect = card.getBoundingClientRect();
    spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, r.color);

    // Update stats
    refreshStats(container, manager);

    // Refresh privilege panel
    const privPanel = container.querySelector('.ach-privileges');
    if (privPanel) {
      privPanel.remove();
      renderPrivilegePanel(container, manager);
    }

    card.addEventListener('animationend', function() {
      card.classList.remove('unlocking', 'glow-pulse');
    }, { once: true });
  });

  return { container, refreshStats: () => refreshStats(container, manager) };
}

function refreshStats(container, manager) {
  const dist = manager.getRarityDistribution();
  const statCards = container.querySelectorAll('.ach-stat-card');
  if (statCards[0]) {
    const numEl = statCards[0].querySelector('.stat-num');
    if (numEl) {
      numEl.innerHTML = manager.unlockedCount + '<span style="font-size:1rem;color:var(--text-dim)"> / ' + manager.totalCount + '</span>';
    }
  }
  if (statCards[1]) {
    const dots = statCards[1].querySelector('.ach-rarity-dots');
    if (dots) {
      dots.innerHTML = ['common','rare','epic','legendary'].map(r =>
        '<span class="ach-rarity-dot"><span class="dot ' + r + '"></span> ' + dist.unlocked[r] + '/' + dist.total[r] + '</span>'
      ).join('');
    }
  }
}

// ── Privilege panel ──
export function renderPrivilegePanel(container, manager) {
  if (typeof container === 'string') container = document.querySelector(container);

  const existing = container.querySelector('.ach-privileges');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.className = 'ach-privileges';

  const allIds = Object.keys(manager.config);
  const privileges = [];

  for (const id of allIds) {
    const ach = manager.config[id];
    if (!ach.privilege) continue;
    const owned = manager.hasPrivilege(ach.privilege.type);
    const r = RARITY[ach.rarity] || RARITY.common;
    privileges.push({
      icon: ach.icon,
      name: ach.name,
      desc: ach.privilege.description,
      owned: owned,
      rarity: ach.rarity,
      color: r.color,
    });
  }

  panel.innerHTML = `
    <h3>🎁 特权技能树</h3>
    <div class="priv-list">
      ${privileges.map(p => `
        <div class="priv-item ${p.owned ? 'owned' : ''}" style="--rarity-color:${p.color}">
          <span class="priv-icon">${p.icon}</span>
          <div class="priv-info">
            <div class="priv-name">${p.name}</div>
            <div class="priv-desc">${p.desc}</div>
          </div>
          <span class="priv-status ${p.owned ? 'active' : 'locked'}">${p.owned ? '已解锁' : '未解锁'}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.appendChild(panel);
  return panel;
}