/**
 * HexagonRadar — 六边形战士雷达图模块
 * 原生 Canvas 实现，零外部依赖
 *
 * @license MIT
 * @version 1.1.0
 */
(function (global) {
  'use strict';

  // ============ DEFAULT OPTIONS ============
  const DEFAULTS = {
    maxValue: 100,
    animationDuration: 1.8,
    petalStagger: 0.06,
    showGrid: true,
    showLabels: true,
    showTooltip: true,
    starCount: 120,
    canvasWidth: 600,
    canvasHeight: 600,
    devicePixelRatio: null, // auto-detect, capped at 2
    storageKey: 'hexagon-radar-values', // localStorage key for runtime values
    // Canvas theme colors (override for skinning)
    theme: {
      bgDeep: '#0B0F19',
      bgMid: '#1A233A',
      gridLine: 'rgba(255, 255, 255, 0.08)',
      gridLineOuter: 'rgba(255, 255, 255, 0.18)',
      axisLine: 'rgba(255, 255, 255, 0.06)',
      labelColor: '#E8E8E8',
      polygonGlow: 'rgba(255, 193, 7, 0.7)',
      polygonFillCenter: 'rgba(255, 152, 0, 0.55)',
      polygonFillMid: 'rgba(255, 193, 7, 0.35)',
      polygonFillEdge: 'rgba(255, 193, 7, 0.18)',
      polygonFillOuter: 'rgba(255, 215, 0, 0.06)',
      polygonStroke: 'rgba(255, 215, 0, 0.7)',
      prevPolygonStroke: 'rgba(255, 255, 255, 0.45)',
      dotInner: '#FFFFFF',
      pulseColor: '#FFD700',
      sparkleColor: '#FFE082',
      badgeFillCenter: 'rgba(255, 180, 0, 0.9)',
      badgeFillMid: 'rgba(255, 200, 0, 0.75)',
      badgeFillEdge: 'rgba(255, 215, 0, 0.5)',
      badgeFillOuter: 'rgba(255, 230, 50, 0.2)',
      badgeStroke: 'rgba(255, 215, 0, 0.9)',
      badgeText: '#FFD700',
      tooltipBg: 'rgba(10, 15, 30, 0.92)',
      starColor: 'rgba(255, 255, 255,',
    },
    messages: {
      single: [
        '🔥 厉害！{dim}大幅提升，继续保持！',
        '⚡ 太棒了！你的{dim}肌肉变强了！',
        '🌟 哇！{dim}进步明显，六边形战士正在成型！',
        '💪 干得漂亮！{dim}这一项突破很大！',
        '✨ 优秀！{dim}的提升让你离完美六边形更近了！',
        '🎯 漂亮！{dim}成长显著，思辨力全面进化中！',
      ],
      multi: [
        '🔥 厉害！{dims}都大幅提升，继续保持！',
        '⚡ 太棒了！{dims}同时突破，全面发展！',
        '🌟 哇！{dims}齐头并进，六边形战士正在成型！',
        '💪 干得漂亮！{dims}这几项进步飞快！',
        '✨ 优秀！{dims}的成长让你离完美六边形更近了！',
        '🎯 漂亮！{dims}全面开花，思辨力进化中！',
      ],
      badge: '🎉 太厉害了！所有维度都已满级，你是完美的六边形战士！',
      noGrowth: '💤 这次修炼没有明显成长，继续加油！',
      initial: '✨ 你的六边形勋章正在成型...',
    },
    callbacks: {
      onGrowth: null,
      onBadge: null,
      onAnimationComplete: null,
      onMotivation: null,
      onDimensionClick: null,
    },
  };

  // ============ EASING HELPERS ============
  function easeOutBack(t) {
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  // ============ MAIN CLASS ============
  class HexagonRadar {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} options — see DEFAULTS above
     * @param {Array}  options.dimensions — [{id, label, value, color}, ...]
     * @param {Array}  [options.previousValues] — previous values for comparison
     */
    constructor(canvas, options) {
      if (!canvas || !canvas.getContext) {
        throw new Error('HexagonRadar: a valid <canvas> element is required');
      }
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      // Merge options
      this.opts = this._mergeOptions(options);
      this.dimensions = this.opts.dimensions;
      this.dimCount = this.dimensions.length;
      this.angleStep = (2 * Math.PI) / this.dimCount;
      this.startAngle = -Math.PI / 2;

      // Canvas dimensions
      this.W = this.opts.canvasWidth;
      this.H = this.opts.canvasHeight;
      this.CX = this.W / 2;
      this.CY = this.H / 2;
      this.maxR = Math.min(this.W, this.H) * 0.325;

      // DPR setup
      const dpr = this.opts.devicePixelRatio || Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = this.W * dpr;
      canvas.height = this.H * dpr;
      canvas.style.width = this.W + 'px';
      canvas.style.height = this.H + 'px';
      this.ctx.scale(dpr, dpr);
      this._dpr = dpr;

      // State — try localStorage first, fall back to config values
      const saved = this._loadFromStorage();
      if (saved) {
        this.currentValues = saved.currentValues;
        this.previousValues = saved.previousValues;
      } else {
        this.currentValues = this.dimensions.map(d => d.value);
        this.previousValues = this.opts.previousValues
          ? [...this.opts.previousValues]
          : this.currentValues.map(() => 0);
      }
      this._animStartTime = 0;
      this._animActive = false;
      this._animStartValues = null;
      this._animTargetValues = null;
      this._particles = [];
      this._pulseEffects = [];
      this._sparkles = [];
      this._stars = [];
      this._badgeSparkles = [];
      this._mouseX = -100;
      this._mouseY = -100;
      this._hoveredDim = -1;
      this._lastTime = 0;
      this._badgeMode = false;
      this._badgeEnterTime = 0;
      this._rafId = null;
      this._boundHandlers = {};

      // Click handler for dimension descriptions (vertex + label area)
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        const scaleY = this.H / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const values = this._animActive ? this._animTargetValues : this.currentValues;
        for (let i = 0; i < this.dimCount; i++) {
          const v = this._getVertex(i, values[i]);
          const labelV = this._getVertex(i, this.opts.maxValue, 38);
          // Check vertex dot and label text area
          if (dist(cx, cy, v.x, v.y) < 28 || dist(cx, cy, labelV.x, labelV.y) < 50) {
            if (this.opts.callbacks.onDimensionClick) {
              this.opts.callbacks.onDimensionClick(this.dimensions[i], this.currentValues[i]);
            }
            break;
          }
        }
      });

      // Generate starfield
      this._generateStars();

      // Start render loop
      this._rafId = requestAnimationFrame((t) => this._animate(t));
    }

    // ============ PUBLIC API ============

    /**
     * Trigger a random training session. Each dimension grows by 1–8.
     * @returns {Object} { growthMap, targetValues, topLabels, message }
     */
    train() {
      if (this._animActive) return null;
      if (this._badgeMode) {
        this._emitMotivation(this.opts.messages.badge);
        return null;
      }

      const allMaxed = this.currentValues.every(v => v >= this.opts.maxValue);
      if (allMaxed) {
        this._enterBadgeMode(performance.now());
        this._emitMotivation(this.opts.messages.badge);
        return null;
      }

      this.previousValues = this.currentValues.slice();

      const targetValues = this.currentValues.map(v => {
        const delta = Math.floor(Math.random() * 8) + 1;
        return Math.min(this.opts.maxValue, v + delta);
      });

      const growthMap = {};
      const growthIndices = [];
      for (let i = 0; i < this.dimCount; i++) {
        const growth = targetValues[i] - this.currentValues[i];
        if (growth > 0) {
          growthMap[this.dimensions[i].id] = growth;
          growthIndices.push(i);
        }
      }

      const topLabels = this._getTopLabels(growthMap);
      const message = this._buildMotivationMessage(growthMap);

      this._emitMotivation(message);
      if (this.opts.callbacks.onGrowth) {
        this.opts.callbacks.onGrowth(growthMap, topLabels);
      }

      this._startBloomAnimation(targetValues, growthIndices);
      return { growthMap, targetValues, topLabels, message };
    }

    /**
     * Set dimension values directly with optional animation.
     * @param {number[]} values — new values, same order as dimensions
     * @param {boolean}  [animate=true]
     */
    setValues(values, animate) {
      if (this._animActive) return;
      if (animate === false) {
        this.currentValues = values.slice();
        this.previousValues = values.slice();
        return;
      }
      const growthIndices = [];
      for (let i = 0; i < this.dimCount; i++) {
        if (values[i] > this.currentValues[i]) growthIndices.push(i);
      }
      this.previousValues = this.currentValues.slice();
      this._startBloomAnimation(values.slice(), growthIndices);
    }

    /** Get current dimension values. */
    getValues() {
      return this.currentValues.slice();
    }

    /** Get dimension metadata. */
    getDimensions() {
      return this.dimensions.map(d => ({ ...d }));
    }

    /** Whether badge mode is active (all dimensions at max). */
    isBadge() {
      return this._badgeMode;
    }

    /**
     * Bind a training button + optional motivation element.
     * The button's click handler calls this.train().
     * @param {HTMLElement} btnEl
     * @param {HTMLElement} [motivationEl]
     * @param {Object}      [opts]
     * @param {string}      [opts.badgeText='🏆 六边形战士已达成']
     * @param {string}      [opts.badgeBg='linear-gradient(135deg, #FFD700 0%, #FF6D00 100%)']
     */
    bindTrainButton(btnEl, motivationEl, opts) {
      opts = opts || {};
      this._boundHandlers.btn = btnEl;
      this._boundHandlers.motivation = motivationEl;
      this._boundHandlers.btnOpts = {
        badgeText: opts.badgeText || '🏆 六边形战士已达成',
        badgeBg: opts.badgeBg || 'linear-gradient(135deg, #FFD700 0%, #FF6D00 100%)',
      };

      btnEl.addEventListener('click', () => {
        if (this._animActive) return;
        btnEl.disabled = true;
        const result = this.train();
        // If train() returned null (badge or all-maxed), re-enable immediately
        if (!result) btnEl.disabled = false;
      });

      // Override callbacks to wire up button/motivation
      const origComplete = this.opts.callbacks.onAnimationComplete;
      this.opts.callbacks.onAnimationComplete = (values) => {
        if (btnEl) btnEl.disabled = false;
        if (origComplete) origComplete(values);
      };

      const origBadge = this.opts.callbacks.onBadge;
      this.opts.callbacks.onBadge = () => {
        if (btnEl) {
          btnEl.innerHTML = '<span>' + this._boundHandlers.btnOpts.badgeText + '</span>';
          btnEl.style.background = this._boundHandlers.btnOpts.badgeBg;
          btnEl.disabled = false;
        }
        if (origBadge) origBadge();
      };

      const origMotivation = this.opts.callbacks.onMotivation;
      this.opts.callbacks.onMotivation = (msg) => {
        if (motivationEl) {
          motivationEl.textContent = msg;
          motivationEl.classList.remove('pop');
          void motivationEl.offsetWidth;
          motivationEl.classList.add('pop');
        }
        if (origMotivation) origMotivation(msg);
      };
    }

    /**
     * Start the initial bloom animation (call after construction).
     * @param {string} [message] — initial motivation message
     */
    startInitialAnimation(message) {
      const initialTargets = this.dimensions.map(d => d.value);
      this._animStartValues = new Array(this.dimCount).fill(0);
      this._animTargetValues = initialTargets.slice();
      this.currentValues = new Array(this.dimCount).fill(0);
      this._animStartTime = performance.now();
      this._animActive = true;
      this._spawnBloomParticles();
      this._emitMotivation(message || this.opts.messages.initial);
    }

    /** Stop animation loop and clean up. */
    destroy() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._boundHandlers.btn) {
        // Clean up is handled by GC; listeners on the button persist
        // but the class instance won't fire callbacks after destroy
      }
      this._animActive = false;
    }

    /**
     * Save current runtime values to localStorage.
     * Called automatically after each animation completes.
     */
    save() {
      try {
        const data = {
          currentValues: this.currentValues.slice(),
          previousValues: this.previousValues.slice(),
        };
        localStorage.setItem(this.opts.storageKey, JSON.stringify(data));
      } catch (e) {
        // localStorage may be full or unavailable
      }
    }

    /**
     * Reset all values to the initial config values and clear localStorage.
     * @param {boolean} [animate=false] — play bloom animation from zero
     */
    reset(animate) {
      this._badgeMode = false;
      this._badgeSparkles = [];
      this.currentValues = this.dimensions.map(d => d.value);
      this.previousValues = this.opts.previousValues
        ? [...this.opts.previousValues]
        : this.currentValues.map(() => 0);

      // Clear localStorage
      try { localStorage.removeItem(this.opts.storageKey); } catch (e) {}

      // Reset button state
      if (this._boundHandlers.btn) {
        this._boundHandlers.btn.innerHTML = '<span>⚔️ 模拟修炼一节课</span>';
        this._boundHandlers.btn.style.background = '';
        this._boundHandlers.btn.disabled = false;
      }

      if (animate) {
        this._animStartValues = new Array(this.dimCount).fill(0);
        this._animTargetValues = this.currentValues.slice();
        this._animStartTime = performance.now();
        this._animActive = true;
        this._spawnBloomParticles();
        this._emitMotivation(this.opts.messages.initial);
      }

      this._emitMotivation(this.opts.messages.initial);
    }

    // ============ INTERNAL METHODS ============

    _loadFromStorage() {
      try {
        const raw = localStorage.getItem(this.opts.storageKey);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data.currentValues && Array.isArray(data.currentValues) &&
            data.currentValues.length === this.dimCount) {
          return {
            currentValues: data.currentValues,
            previousValues: data.previousValues || data.currentValues.map(() => 0),
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    }

    _saveToStorage() {
      this.save();
    }

    _mergeOptions(options) {
      if (!options || !options.dimensions) {
        throw new Error('HexagonRadar: options.dimensions is required');
      }
      const merged = {
        ...DEFAULTS,
        ...options,
        messages: { ...DEFAULTS.messages, ...(options.messages || {}) },
        callbacks: { ...DEFAULTS.callbacks, ...(options.callbacks || {}) },
        theme: { ...DEFAULTS.theme, ...(options.theme || {}) },
      };
      return merged;
    }

    /** Shortcut: get theme color by key */
    _t(key) {
      return this.opts.theme[key];
    }

    /**
     * Update theme colors at runtime (for skin switching).
     * @param {Object} theme — partial theme object, merged with current
     */
    setTheme(theme) {
      Object.assign(this.opts.theme, theme);
    }

    _getAngle(index) {
      return this.startAngle + index * this.angleStep;
    }

    _getVertex(index, value, radiusOffset) {
      radiusOffset = radiusOffset || 0;
      const angle = this._getAngle(index);
      const r = (value / this.opts.maxValue) * this.maxR + radiusOffset;
      return { x: this.CX + r * Math.cos(angle), y: this.CY + r * Math.sin(angle) };
    }

    _getTopLabels(growthMap) {
      const entries = Object.entries(growthMap);
      if (entries.length === 0) return [];
      const maxGrowth = Math.max(...entries.map(e => e[1]));
      return entries
        .filter(e => e[1] === maxGrowth)
        .map(e => {
          const dim = this.dimensions.find(d => d.id === e[0]);
          return dim ? dim.label : e[0];
        });
    }

    _buildMotivationMessage(growthMap) {
      const entries = Object.entries(growthMap);
      if (entries.length === 0) return this.opts.messages.noGrowth;
      const topLabels = this._getTopLabels(growthMap);
      if (topLabels.length === 1) {
        const tpl = this.opts.messages.single[Math.floor(Math.random() * this.opts.messages.single.length)];
        return tpl.replace('{dim}', topLabels[0]);
      } else {
        const tpl = this.opts.messages.multi[Math.floor(Math.random() * this.opts.messages.multi.length)];
        return tpl.replace('{dims}', topLabels.join('、'));
      }
    }

    _emitMotivation(msg) {
      if (this.opts.callbacks.onMotivation) {
        this.opts.callbacks.onMotivation(msg);
      }
    }

    _enterBadgeMode(now) {
      this._badgeMode = true;
      this._badgeEnterTime = now;
      this._badgeSparkles = [];
      for (let i = 0; i < 15; i++) this._spawnBadgeSparkles();
      this._emitMotivation(this.opts.messages.badge);
      if (this.opts.callbacks.onBadge) {
        this.opts.callbacks.onBadge();
      }
    }

    // ============ STARFIELD ============
    _generateStars() {
      this._stars = [];
      for (let i = 0; i < this.opts.starCount; i++) {
        this._stars.push({
          x: Math.random() * this.W,
          y: Math.random() * this.H,
          r: Math.random() * 1.4 + 0.3,
          baseAlpha: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 2 + 1,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    _drawStars(time) {
      const ctx = this.ctx;
      for (const s of this._stars) {
        const alpha = s.baseAlpha + Math.sin(time * 0.001 * s.twinkleSpeed + s.twinkleOffset) * 0.2;
        ctx.fillStyle = `${this._t('starColor')} ${Math.max(0.1, alpha)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ============ DRAWING: GRID ============
    _drawGrid() {
      if (!this.opts.showGrid) return;
      const ctx = this.ctx;
      const levels = [0.33, 0.66, 1.0];
      for (const lvl of levels) {
        const r = this.maxR * lvl;
        ctx.beginPath();
        for (let i = 0; i < this.dimCount; i++) {
          const angle = this._getAngle(i);
          const x = this.CX + r * Math.cos(angle);
          const y = this.CY + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = lvl === 1.0
          ? this._t('gridLineOuter')
          : this._t('gridLine');
        ctx.lineWidth = lvl === 1.0 ? 1.2 : 0.8;
        ctx.stroke();
      }
      // Axis lines
      for (let i = 0; i < this.dimCount; i++) {
        const v = this._getVertex(i, this.opts.maxValue);
        ctx.beginPath();
        ctx.moveTo(this.CX, this.CY);
        ctx.lineTo(v.x, v.y);
        ctx.strokeStyle = this._t('axisLine');
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // ============ DRAWING: LABELS ============
    _drawLabels() {
      if (!this.opts.showLabels) return;
      const ctx = this.ctx;
      for (let i = 0; i < this.dimCount; i++) {
        const dim = this.dimensions[i];
        const v = this._getVertex(i, this.opts.maxValue, 38);
        ctx.save();
        ctx.font = 'bold 15px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = dim.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this._t('labelColor');
        ctx.fillText(dim.label, v.x, v.y);
        ctx.shadowBlur = 0;
        // Colored dot
        const dotV = this._getVertex(i, this.opts.maxValue, 24);
        ctx.fillStyle = dim.color;
        ctx.beginPath();
        ctx.arc(dotV.x, dotV.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ============ DRAWING: DATA POLYGON ============
    _drawDataPolygon(values, alpha, rotationOffset) {
      alpha = alpha || 1;
      rotationOffset = rotationOffset || 0;
      if (values.every(v => v < 0.5)) return;
      const ctx = this.ctx;

      const points = [];
      for (let i = 0; i < this.dimCount; i++) {
        const angle = this._getAngle(i) + rotationOffset;
        const r = (values[i] / this.opts.maxValue) * this.maxR;
        points.push({
          x: this.CX + r * Math.cos(angle),
          y: this.CY + r * Math.sin(angle),
        });
      }

      // Outer glow
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      ctx.shadowColor = this._t('polygonGlow');
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 193, 7, 0.25)';
      ctx.fill();
      ctx.restore();

      // Radial gradient fill
      ctx.save();
      ctx.globalAlpha = alpha;
      const gradient = ctx.createRadialGradient(this.CX, this.CY, 0, this.CX, this.CY, this.maxR);
      gradient.addColorStop(0, this._t('polygonFillCenter'));
      gradient.addColorStop(0.45, this._t('polygonFillMid'));
      gradient.addColorStop(0.8, this._t('polygonFillEdge'));
      gradient.addColorStop(1, this._t('polygonFillOuter'));
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = this._t('polygonStroke');
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // ============ DRAWING: PREVIOUS POLYGON ============
    _drawPreviousPolygon(values, alpha) {
      if (!values || values.every(v => v < 0.5)) return;
      alpha = alpha || 0.25;
      const ctx = this.ctx;
      const points = [];
      for (let i = 0; i < this.dimCount; i++) {
        points.push(this._getVertex(i, values[i]));
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.strokeStyle = this._t('prevPolygonStroke');
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ============ DRAWING: VERTEX DOTS ============
    _drawVertexDots(values, alpha, rotationOffset, highlightIndices) {
      alpha = alpha || 1;
      rotationOffset = rotationOffset || 0;
      highlightIndices = highlightIndices || [];
      const ctx = this.ctx;
      for (let i = 0; i < this.dimCount; i++) {
        const angle = this._getAngle(i) + rotationOffset;
        const r = (values[i] / this.opts.maxValue) * this.maxR;
        const x = this.CX + r * Math.cos(angle);
        const y = this.CY + r * Math.sin(angle);
        const dim = this.dimensions[i];
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = dim.color;
        ctx.shadowColor = dim.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this._t('dotInner');
        ctx.shadowColor = this._t('dotInner');
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ============ DRAWING: PULSE RINGS ============
    _drawPulseEffects() {
      const ctx = this.ctx;
      for (const pulse of this._pulseEffects) {
        const progress = pulse.elapsed / pulse.duration;
        if (progress >= 1) continue;
        const eased = easeOutCubic(progress);
        const ringR = lerp(4, 40, eased);
        const alpha = (1 - progress) * 0.8;
        const v = this._getVertex(pulse.dimIndex, pulse.value);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this._t('pulseColor');
        ctx.lineWidth = 2.5 * (1 - progress);
        ctx.shadowColor = this._t('pulseColor');
        ctx.shadowBlur = 16 * (1 - progress);
        ctx.beginPath();
        ctx.arc(v.x, v.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = this._t('pulseColor');
        ctx.lineWidth = 1.2 * (1 - progress);
        ctx.shadowColor = this._t('pulseColor');
        ctx.shadowBlur = 8 * (1 - progress);
        ctx.beginPath();
        ctx.arc(v.x, v.y, ringR * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ============ DRAWING: SPARKLES ============
    _drawSparkles(time) {
      const ctx = this.ctx;
      for (const sp of this._sparkles) {
        const progress = sp.elapsed / sp.duration;
        if (progress >= 1) continue;
        const alpha = Math.sin(progress * Math.PI) * 0.9;
        const size = (1 - progress) * 3 + 1;
        const v = this._getVertex(sp.dimIndex, sp.value);
        const orbitAngle = sp.angle + progress * Math.PI * 2;
        const orbitR = (1 - progress) * 18 + 6;
        const sx = v.x + orbitR * Math.cos(orbitAngle);
        const sy = v.y + orbitR * Math.sin(orbitAngle);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this._t('sparkleColor');
        ctx.shadowColor = this._t('pulseColor');
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ============ DRAWING: BADGE MODE ============
    _spawnBadgeSparkles() {
      for (let i = 0; i < 3; i++) {
        this._badgeSparkles.push({
          angle: Math.random() * Math.PI * 2,
          dist: Math.random() * this.maxR * 0.9 + this.maxR * 0.5,
          size: Math.random() * 2 + 1,
          lifetime: Math.random() * 1.5 + 1,
          elapsed: Math.random() * 1.5,
          orbitSpeed: (Math.random() - 0.5) * 1.5,
        });
      }
    }

    _drawBadge(now) {
      const ctx = this.ctx;
      const badgeAge = (now - this._badgeEnterTime) / 1000;
      const hexPoints = [];
      for (let i = 0; i < this.dimCount; i++) {
        const angle = this._getAngle(i);
        hexPoints.push({
          x: this.CX + this.maxR * Math.cos(angle),
          y: this.CY + this.maxR * Math.sin(angle),
        });
      }

      // Outer glow
      ctx.save();
      ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
      ctx.shadowBlur = 40 + Math.sin(now * 0.002) * 8;
      ctx.beginPath();
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      for (let i = 1; i < hexPoints.length; i++) ctx.lineTo(hexPoints[i].x, hexPoints[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
      ctx.fill();
      ctx.restore();

      // Solid hexagon
      ctx.save();
      const gradient = ctx.createRadialGradient(this.CX, this.CY, this.maxR * 0.2, this.CX, this.CY, this.maxR);
      gradient.addColorStop(0, this._t('badgeFillCenter'));
      gradient.addColorStop(0.5, this._t('badgeFillMid'));
      gradient.addColorStop(0.8, this._t('badgeFillEdge'));
      gradient.addColorStop(1, this._t('badgeFillOuter'));
      ctx.beginPath();
      ctx.moveTo(hexPoints[0].x, hexPoints[0].y);
      for (let i = 1; i < hexPoints.length; i++) ctx.lineTo(hexPoints[i].x, hexPoints[i].y);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = this._t('badgeStroke');
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();

      // Rotating light sweep
      const sweepAngle = (now * 0.001) % (Math.PI * 2);
      const sweepLen = 0.6;
      for (let i = 0; i < this.dimCount; i++) {
        const a1 = this._getAngle(i);
        const a2 = this._getAngle((i + 1) % this.dimCount);
        const midAngle = (a1 + a2) / 2;
        const distToSweep = Math.abs(Math.atan2(
          Math.sin(sweepAngle - midAngle),
          Math.cos(sweepAngle - midAngle)
        ));
        if (distToSweep < sweepLen) {
          const alpha = (1 - distToSweep / sweepLen) * 0.6;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(hexPoints[i].x, hexPoints[i].y);
          ctx.lineTo(hexPoints[(i + 1) % this.dimCount].x, hexPoints[(i + 1) % this.dimCount].y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Vertex dots
      for (let i = 0; i < this.dimCount; i++) {
        const v = hexPoints[i];
        const dim = this.dimensions[i];
        ctx.save();
        ctx.fillStyle = dim.color;
        ctx.shadowColor = dim.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = this._t('dotInner');
        ctx.shadowColor = this._t('dotInner');
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Crown
      const breathe = 1 + Math.sin(now * 0.003) * 0.06;
      ctx.save();
      ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#FFFFFF';
      ctx.translate(this.CX, this.CY - 8);
      ctx.scale(breathe, breathe);
      ctx.fillText('👑', 0, 0);
      ctx.restore();

      // Badge text
      ctx.save();
      ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = this._t('badgeText');
      ctx.fillText('六边形战士', this.CX, this.CY + 38);
      ctx.restore();

      // Badge sparkles
      for (const bs of this._badgeSparkles) {
        const progress = bs.elapsed / bs.lifetime;
        if (progress >= 1) continue;
        const alpha = Math.sin(progress * Math.PI) * 0.8;
        const sx = this.CX + bs.dist * Math.cos(bs.angle + bs.orbitSpeed * badgeAge);
        const sy = this.CY + bs.dist * Math.sin(bs.angle + bs.orbitSpeed * badgeAge);
        const size = bs.size * (1 - progress * 0.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this._t('sparkleColor');
        ctx.shadowColor = this._t('pulseColor');
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 2);
        ctx.lineTo(sx + size, sy);
        ctx.lineTo(sx, sy + size * 2);
        ctx.lineTo(sx - size, sy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // ============ DRAWING: BLOOM PARTICLES ============
    _drawParticles() {
      const ctx = this.ctx;
      for (const p of this._particles) {
        const progress = p.elapsed / p.lifetime;
        if (progress >= 1) continue;
        const alpha = (1 - progress) * 0.8;
        const size = lerp(p.size, 0.3, progress);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ============ DRAWING: TOOLTIP ============
    _drawTooltip() {
      if (!this.opts.showTooltip || this._hoveredDim < 0) return;
      const ctx = this.ctx;
      const dim = this.dimensions[this._hoveredDim];
      const val = this.currentValues[this._hoveredDim];
      const v = this._getVertex(this._hoveredDim, val, 18);
      const text = `${dim.label}: ${val}`;
      ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif';
      const metrics = ctx.measureText(text);
      const tw = metrics.width + 20;
      const th = 30;
      let tx = v.x - tw / 2;
      let ty = v.y - th - 10;
      tx = Math.max(4, Math.min(this.W - tw - 4, tx));
      ty = Math.max(4, ty);
      ctx.save();
      ctx.fillStyle = this._t('tooltipBg');
      ctx.strokeStyle = dim.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = dim.color;
      ctx.shadowBlur = 12;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(tx + r, ty);
      ctx.lineTo(tx + tw - r, ty);
      ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
      ctx.lineTo(tx + tw, ty + th - r);
      ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - r, ty + th);
      ctx.lineTo(tx + r, ty + th);
      ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - r);
      ctx.lineTo(tx, ty + r);
      ctx.quadraticCurveTo(tx, ty, tx + r, ty);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx + tw / 2, ty + th / 2);
      ctx.restore();
    }

    // ============ PARTICLE SPAWNING ============
    _spawnBloomParticles() {
      const count = 40;
      for (let i = 0; i < count; i++) {
        const dimIndex = Math.floor(Math.random() * this.dimCount);
        const angle = this._getAngle(dimIndex) + (Math.random() - 0.5) * 0.5;
        const speed = Math.random() * 180 + 60;
        this._particles.push({
          x: this.CX,
          y: this.CY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.5 + 1,
          color: Math.random() < 0.5 ? '#FFD700' : '#FFA000',
          lifetime: Math.random() * 0.8 + 0.6,
          elapsed: 0,
        });
      }
    }

    _spawnPulseEffect(dimIndex, value) {
      this._pulseEffects.push({ dimIndex, value, duration: 0.7, elapsed: 0 });
    }

    _spawnSparkles(dimIndex, value, count) {
      for (let i = 0; i < count; i++) {
        this._sparkles.push({
          dimIndex, value,
          angle: Math.random() * Math.PI * 2,
          duration: Math.random() * 0.5 + 0.5,
          elapsed: 0,
        });
      }
    }

    // ============ ANIMATION LOGIC ============
    _startBloomAnimation(targetValues, growthIndices) {
      this._animStartValues = this.currentValues.slice();
      this._animTargetValues = targetValues.slice();
      this._animStartTime = performance.now();
      this._animActive = true;
      this._particles = [];
      this._pulseEffects = [];
      this._sparkles = [];
      this._spawnBloomParticles();
    }

    _getDisplayValues(elapsed) {
      const duration = this.opts.animationDuration;
      const stagger = this.opts.petalStagger;
      const petalDuration = duration - stagger * (this.dimCount - 1);
      const displayValues = new Array(this.dimCount).fill(0);
      for (let i = 0; i < this.dimCount; i++) {
        const petalStart = stagger * i;
        const petalElapsed = elapsed - petalStart;
        if (petalElapsed <= 0) {
          displayValues[i] = 0;
        } else {
          const progress = Math.min(petalElapsed / petalDuration, 1);
          displayValues[i] = this._animTargetValues[i] * easeOutBack(progress);
        }
      }
      return displayValues;
    }

    _getRotationOffset(elapsed) {
      const progress = Math.min(elapsed / this.opts.animationDuration, 1);
      return (1 - easeOutCubic(progress)) * 0.25;
    }

    _updateAnimation(now) {
      if (!this._animActive) return;
      const elapsed = (now - this._animStartTime) / 1000;
      const duration = this.opts.animationDuration;
      const dt = this._lastTime ? Math.min((now - this._lastTime) / 1000, 0.1) : 0.016;

      // Update particles
      for (const p of this._particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.elapsed += dt;
      }
      this._particles = this._particles.filter(p => p.elapsed < p.lifetime);

      // Update pulse effects
      for (const p of this._pulseEffects) p.elapsed += dt;
      this._pulseEffects = this._pulseEffects.filter(p => p.elapsed < p.duration);

      // Update sparkles
      for (const s of this._sparkles) s.elapsed += dt;
      this._sparkles = this._sparkles.filter(s => s.elapsed < s.duration);

      // Trigger pulse per petal
      const stagger = this.opts.petalStagger;
      const petalDuration = duration - stagger * (this.dimCount - 1);
      for (let i = 0; i < this.dimCount; i++) {
        const petalEnd = stagger * i + petalDuration;
        if (elapsed >= petalEnd && elapsed - dt < petalEnd) {
          if (this._animTargetValues[i] > this._animStartValues[i]) {
            this._spawnPulseEffect(i, this._animTargetValues[i]);
            this._spawnSparkles(i, this._animTargetValues[i], 8);
          }
        }
      }

      // Animation complete
      if (elapsed >= duration) {
        this._animActive = false;
        this.currentValues = this._animTargetValues.slice();
        this._particles = [];

        // Auto-save to localStorage
        this._saveToStorage();

        if (this.currentValues.every(v => v >= this.opts.maxValue) && !this._badgeMode) {
          this._enterBadgeMode(now);
        }

        if (this.opts.callbacks.onAnimationComplete) {
          this.opts.callbacks.onAnimationComplete(this.currentValues.slice());
        }
      }
    }

    // ============ MAIN RENDER ============
    _render(now) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      this._drawStars(now);

      if (this._badgeMode) {
        const dt = this._lastTime ? Math.min((now - this._lastTime) / 1000, 0.1) : 0.016;
        for (const bs of this._badgeSparkles) bs.elapsed += dt;
        this._badgeSparkles = this._badgeSparkles.filter(bs => bs.elapsed < bs.lifetime);
        if (this._badgeSparkles.length < 20 && Math.random() < 0.3) {
          this._spawnBadgeSparkles();
        }
        this._drawBadge(now);
        this._drawTooltip();
        return;
      }

      this._drawGrid();
      this._drawLabels();

      let displayValues, rotationOffset = 0;
      const growthIndices = [];

      if (this._animActive) {
        const elapsed = (now - this._animStartTime) / 1000;
        displayValues = this._getDisplayValues(elapsed);
        rotationOffset = this._getRotationOffset(elapsed);
        for (let i = 0; i < this.dimCount; i++) {
          if (this._animTargetValues[i] > this._animStartValues[i]) {
            growthIndices.push(i);
          }
        }
      } else {
        displayValues = this.currentValues;
        if (this.previousValues.some((v, i) => v !== this.currentValues[i])) {
          this._drawPreviousPolygon(this.previousValues);
        }
      }

      if (this._animActive && this._animStartValues) {
        const elapsed = (now - this._animStartTime) / 1000;
        const prevAlpha = Math.max(0, 0.3 * (1 - elapsed / 0.6));
        if (prevAlpha > 0.01) {
          this._drawPreviousPolygon(this._animStartValues, prevAlpha);
        }
      }

      this._drawDataPolygon(displayValues, this._animActive ? 0.85 : 1, rotationOffset);
      this._drawVertexDots(displayValues, 1, rotationOffset, growthIndices);
      this._drawParticles();
      this._drawPulseEffects();
      this._drawSparkles(now);
      this._drawTooltip();
    }

    // ============ ANIMATION LOOP ============
    _animate(now) {
      if (!this._lastTime) this._lastTime = now;
      const dt = Math.min((now - this._lastTime) / 1000, 0.1);
      this._lastTime = now;

      this._updateAnimation(now);
      this._render(now);

      this._rafId = requestAnimationFrame((t) => this._animate(t));
    }

    // ============ MOUSE / TOUCH (called internally) ============
    _handlePointerMove(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const scaleY = this.H / rect.height;
      this._mouseX = (clientX - rect.left) * scaleX;
      this._mouseY = (clientY - rect.top) * scaleY;
      const values = this._animActive ? this._animTargetValues : this.currentValues;
      this._hoveredDim = -1;
      for (let i = 0; i < this.dimCount; i++) {
        const v = this._getVertex(i, values[i]);
        if (dist(this._mouseX, this._mouseY, v.x, v.y) < 22) {
          this._hoveredDim = i;
          break;
        }
      }
      this.canvas.style.cursor = this._hoveredDim >= 0 ? 'pointer' : 'default';
    }

    _handlePointerLeave() {
      this._mouseX = -100;
      this._mouseY = -100;
      this._hoveredDim = -1;
      this.canvas.style.cursor = 'default';
    }
  }

  // ============ STATIC METHODS ============

  /**
   * Fetch a JSON config file and return parsed options for the constructor.
   * The config JSON defines static metadata: dimensions, title, maxValue, etc.
   * Runtime values (current scores) are stored in localStorage, NOT in the JSON.
   *
   * @param {string} url — URL to the JSON config file
   * @returns {Promise<Object>} — options ready for `new HexagonRadar(canvas, opts)`
   */
  HexagonRadar.loadConfig = async function (url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HexagonRadar.loadConfig: failed to fetch ' + url);
    const cfg = await resp.json();
    if (!cfg.dimensions || !Array.isArray(cfg.dimensions)) {
      throw new Error('HexagonRadar.loadConfig: config must have a "dimensions" array');
    }

    // Normalize: allow "initialValue" or "value" in config
    const dimensions = cfg.dimensions.map(d => ({
      id: d.id,
      label: d.label,
      color: d.color,
      value: d.initialValue !== undefined ? d.initialValue : (d.value || 0),
      description: d.description || '',
    }));

    return {
      dimensions: dimensions,
      previousValues: cfg.previousValues || null,
      maxValue: cfg.maxValue || 100,
      title: cfg.title || '',
      subtitle: cfg.subtitle || '',
    };
  };

  // ============ EXPORT ============
  global.HexagonRadar = HexagonRadar;

})(typeof window !== 'undefined' ? window : this);