/* ================================================================
   theme.js — 主题管理器
   ================================================================
   用法（常规脚本）：<script src="theme.js"></script>
   用法（ES Module）：import { applyTheme } from './theme.js';
   ================================================================ */

(function (global) {
  'use strict';

  /** 可用主题预设 */
  const THEME_PRESETS = {
    cyber:  { name: '赛博终端', cssClass: 'cyber' },
    forest: { name: '霓虹森林', cssClass: 'forest' },
    sunset: { name: '日落竞技', cssClass: 'sunset' },
  };

  let _currentTheme = 'cyber';

  /**
   * 切换主题
   * @param {'cyber'|'forest'|'sunset'} name
   */
  function applyTheme(name) {
    if (!THEME_PRESETS[name]) {
      console.warn('Theme "' + name + '" not found, falling back to "cyber"');
      name = 'cyber';
    }
    _currentTheme = name;
    document.documentElement.setAttribute('data-theme', name);
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { name: name, colors: getThemeColors() },
    }));
  }

  function getCurrentTheme() {
    return _currentTheme;
  }

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      bgDeep: style.getPropertyValue('--bg-deep').trim(),
      bgMid: style.getPropertyValue('--bg-mid').trim(),
      bgPanel: style.getPropertyValue('--bg-panel').trim(),
      border: style.getPropertyValue('--border').trim(),
      text: style.getPropertyValue('--text').trim(),
      textDim: style.getPropertyValue('--text-dim').trim(),
      accent: style.getPropertyValue('--accent').trim(),
      accentGlow: style.getPropertyValue('--accent-glow').trim(),
      gold: style.getPropertyValue('--gold').trim(),
      goldGlow: style.getPropertyValue('--gold-glow').trim(),
      goldStrong: style.getPropertyValue('--gold-strong').trim(),
    };
  }

  function parseHexColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  function rgba(hex, alpha) {
    const c = parseHexColor(hex);
    return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + alpha + ')';
  }

  function getRadarTheme() {
    const s = getComputedStyle(document.documentElement);
    const get = function (k) { return s.getPropertyValue(k).trim(); };
    const accent = get('--accent');
    const gold = get('--gold');
    const goldStrong = get('--gold-strong');
    const text = get('--text');
    const textDim = get('--text-dim');
    const bgPanel = get('--bg-panel');

    const starRGB = parseHexColor(textDim);
    const starPrefix = 'rgba(' + starRGB.r + ', ' + starRGB.g + ', ' + starRGB.b + ',';

    return {
      gridLine: rgba(textDim, 0.12),
      gridLineOuter: rgba(textDim, 0.25),
      axisLine: rgba(textDim, 0.08),
      labelColor: text,
      polygonGlow: rgba(gold, 0.7),
      polygonFillCenter: rgba(goldStrong, 0.55),
      polygonFillMid: rgba(gold, 0.35),
      polygonFillEdge: rgba(gold, 0.18),
      polygonFillOuter: rgba(gold, 0.06),
      polygonStroke: rgba(gold, 0.7),
      prevPolygonStroke: rgba(textDim, 0.5),
      dotInner: '#FFFFFF',
      pulseColor: gold,
      sparkleColor: gold,
      badgeFillCenter: rgba(goldStrong, 0.9),
      badgeFillMid: rgba(gold, 0.75),
      badgeFillEdge: rgba(gold, 0.5),
      badgeFillOuter: rgba(gold, 0.2),
      badgeStroke: rgba(gold, 0.9),
      badgeText: gold,
      tooltipBg: rgba(bgPanel || '#0a0f1e', 0.92),
      starColor: starPrefix,
    };
  }

  const themeManager = {
    apply: applyTheme,
    getCurrent: getCurrentTheme,
    getColors: getThemeColors,
    getRadarTheme: getRadarTheme,
    presets: THEME_PRESETS,
  };

  // Export
  global.themeManager = themeManager;
  global.applyTheme = applyTheme;
  global.getRadarTheme = getRadarTheme;

})(typeof window !== 'undefined' ? window : this);