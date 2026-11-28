/* ==========================================================================
   BUSINESS TYCOON TAP - TAB INVESTASI (Saham / Properti / Kripto / Forex & Detail Aset)
   ========================================================================== */

import { CONFIG } from '../../core/config.js';
import { ASSETS } from '../../data/assets.js';
import { hasDOM, root, getEl } from '../../utils/dom.js';
import {
  state,
  runtime,
  getAssetById,
  getCurrentAssetPrice,
  saveState,
  saveMarketPricesThrottled
} from '../../core/state.js';
import {
  formatUsdFull,
  formatUsdCompact,
  formatSignedPercent,
  formatIntegerID,
  formatTimeHHMM
} from '../../utils/format.js';
import {
  isCryptoOrForexCategory,
  calculateAssetHourlyYield,
  calculateTotalInvestmentYield,
  calculateCategoryValuation,
  calculateLivePortfolioSnapshot,
  buildContinuousMarketProfile,
  computeContinuousMarketMetrics
} from './crypto-forex.js';
import {
  renderDetailPriceChart,
  cancelDetailChartAnimation,
  resetDetailChartState,
  sliceTimeframePoints,
  computeSessionStats,
  getDetailChartScrubPoint
} from './detail-chart.js';
import { triggerHaptic, playCoinBlip, showToast } from '../../components/feedback.js';
import { checkMilestones } from '../../components/milestones.js';
import { renderStats, renderUpgrades } from '../earnings/earnings.js';

// Referensi elemen DOM (null di lingkungan pengujian Node)
const investingScreen = getEl('investing-screen');
const investingCategoryScreen = getEl('investing-category-screen');
const investingOwnedScreen = getEl('investing-owned-screen');
const assetDetailScreen = getEl('asset-detail-screen');
const heroTotalValue = getEl('hero-total-value');
const heroHourlyYield = getEl('hero-hourly-yield');
const allocCenterLabel = getEl('alloc-center-label');
const allocCenterTotal = getEl('alloc-center-total');
const allocCenterSub = getEl('alloc-center-sub');
const allocDonutCenter = getEl('alloc-donut-center');
const donutSegmentsGroup = getEl('donut-segments');
const donutWrap = getEl('alloc-donut-wrap') || (hasDOM ? document.querySelector('#investing-screen .donut-wrap') : null);
const legendItems = hasDOM ? Array.from(document.querySelectorAll('[data-legend-category]')) : [];
const legendValSaham = getEl('legend-val-Saham');
const legendValKripto = getEl('legend-val-Kripto');
const legendValForex = getEl('legend-val-Forex');
const legendShareSaham = getEl('legend-share-Saham');
const legendShareKripto = getEl('legend-share-Kripto');
const legendShareForex = getEl('legend-share-Forex');
const categoryBody = getEl('category-body');
const categoryPortfolioCard = getEl('category-portfolio-card');
const catPortfolioTitle = getEl('cat-portfolio-title');
const catPortfolioLabel = getEl('cat-portfolio-label');
const catPortfolioValue = getEl('cat-portfolio-value');
const catPortfolioPnl = getEl('cat-portfolio-pnl');
const catPortfolioYieldLabel = getEl('cat-portfolio-yield-label');
const catPortfolioYield = getEl('cat-portfolio-yield');
const ownedBody = getEl('owned-body');
const ownedListTrack = getEl('owned-list-track');
const ownedEmptyState = getEl('owned-empty-state');
const ownedEmptyText = getEl('owned-empty-text');
const ownedEmptyCtaBtn = getEl('owned-empty-cta-btn');
const categoryCards = hasDOM ? Array.from(document.querySelectorAll('[data-invest-category]')) : [];
const categoryShelves = hasDOM ? Array.from(document.querySelectorAll('[data-shelf]')) : [];
const catCardSubSaham = getEl('cat-card-sub-Saham');
const catCardSubKripto = getEl('cat-card-sub-Kripto');
const catCardSubForex = getEl('cat-card-sub-Forex');
const catCardTotalSaham = getEl('cat-card-total-Saham');
const catCardTotalKripto = getEl('cat-card-total-Kripto');
const catCardTotalForex = getEl('cat-card-total-Forex');
const catCardShareSaham = getEl('cat-card-share-Saham');
const catCardShareKripto = getEl('cat-card-share-Kripto');
const catCardShareForex = getEl('cat-card-share-Forex');
const shelfTrackSaham = getEl('shelf-track-Saham');
const shelfTrackKripto = getEl('shelf-track-Kripto');
const shelfTrackForex = getEl('shelf-track-Forex');
const detailAssetAvatar = getEl('detail-asset-avatar');
const detailAssetSymbol = getEl('detail-asset-symbol');
const detailAssetName = getEl('detail-asset-name');
const detailAssetCategory = getEl('detail-asset-category');
const detailWalletBalance = getEl('detail-wallet-balance');
const detailMarketPriceHero = getEl('detail-market-price-hero');
const detailSessionTag = getEl('detail-session-tag');
const detailPriceChange = getEl('detail-price-change');
const detailMetaStrip = getEl('detail-meta-strip');
const detailOpenRef = getEl('detail-open-ref');
const detailSessionDelta = getEl('detail-session-delta');
const detailLastUpdate = getEl('detail-last-update');
const detailStatsToggle = getEl('detail-stats-toggle');
const detailStatsSummary = getEl('detail-stats-summary');
const detailStatsGrid24 = getEl('detail-stats-grid24');
const detailStatOpenWrap = getEl('detail-stat-open-wrap');
const detailStatsExtra = getEl('detail-stats-extra');
const detailStatOpen = getEl('detail-stat-open');
const detailStatHigh = getEl('detail-stat-high');
const detailStatLow = getEl('detail-stat-low');
const detailStat24High = getEl('detail-stat-24-high');
const detailStat24Low = getEl('detail-stat-24-low');
const detailStat24Vol = getEl('detail-stat-24-vol');
const detailStat24ExtraLabel = getEl('detail-stat-24-extra-label');
const detailStat24ExtraVal = getEl('detail-stat-24-extra-val');
const detailStatSessionHigh = getEl('detail-stat-session-high');
const detailStatSessionLow = getEl('detail-stat-session-low');
const detailStatDrawerYieldItem = getEl('detail-stat-drawer-yield-item');
const detailStatYieldRate = getEl('detail-stat-yield-rate');
const detailStatVolatility = getEl('detail-stat-volatility');
const detailTimeframeBtns = hasDOM ? Array.from(document.querySelectorAll('[data-timeframe]')) : [];
const detailChartModeBtns = hasDOM ? Array.from(document.querySelectorAll('[data-chart-mode]')) : [];
const detailChartTooltip = getEl('detail-chart-tooltip');
const assetPriceCanvas = getEl('asset-price-canvas');
const detailSubtabs = hasDOM ? Array.from(document.querySelectorAll('[data-detail-tab]')) : [];
const detailPanelSummary = getEl('detail-panel-summary');
const detailPanelHoldings = getEl('detail-panel-holdings');
const detailPanelStats = getEl('detail-panel-stats');
const detailSummaryOwned = getEl('detail-summary-owned');
const detailSummaryValue = getEl('detail-summary-value');
const detailSummaryPnl = getEl('detail-summary-pnl');
const detailStatTabCategory = getEl('detail-stat-tab-category');
const detailStatTabSymbol = getEl('detail-stat-tab-symbol');
const detailStatTabUnit = getEl('detail-stat-tab-unit');
const detailStatInitialLabel = getEl('detail-stat-initial-label');
const detailStatTabInitial = getEl('detail-stat-tab-initial');
const detailStatTabVolatility = getEl('detail-stat-tab-volatility');
const detailStatYieldRow = getEl('detail-stat-yield-row');
const detailStatTabYield = getEl('detail-stat-tab-yield');
const detailOwnedUnits = getEl('detail-owned-units');
const detailMarketPrice = getEl('detail-market-price');
const detailAvgEntry = getEl('detail-avg-entry');
const detailMarketValue = getEl('detail-market-value');
const detailTotalCost = getEl('detail-total-cost');
const detailUnrealizedPnl = getEl('detail-unrealized-pnl');
const detailYieldRow = getEl('detail-yield-row');
const detailHourlyYield = getEl('detail-hourly-yield');
const detailBuyBtn = getEl('detail-buy-btn');
const roadmapModal = getEl('roadmap-modal');
const resetModal = getEl('reset-modal');
const offlineModal = getEl('offline-modal');

/**
 * Menginisialisasi harga pasar & menghasilkan 60 titik riwayat mundur dengan random walk.
 */
export function initMarketData() {
  const now = Date.now();
  ASSETS.forEach(function (asset) {
    const savedPrice = Number(state.lastPrices[asset.id]);
    const minAllowed = asset.initialPrice * CONFIG.MIN_PRICE_FACTOR;
    const basePrice =
      Number.isFinite(savedPrice) && savedPrice >= minAllowed
        ? savedPrice
        : asset.initialPrice;

    const roundedBase = Math.round(basePrice * 100) / 100;
    state.lastPrices[asset.id] = roundedBase;

    const points = new Array(CONFIG.HISTORY_MAX);
    let cursorPrice = roundedBase;
    points[CONFIG.HISTORY_MAX - 1] = { ts: now, price: cursorPrice };

    for (let k = CONFIG.HISTORY_MAX - 1; k > 0; k -= 1) {
      const step =
        (Math.random() - CONFIG.RANDOM_WALK_CENTER) *
        CONFIG.RANDOM_WALK_SPREAD *
        asset.volatility;
      const denom = 1 + step;
      const prevRaw = denom > CONFIG.MIN_PRICE_FACTOR ? cursorPrice / denom : cursorPrice;
      const clampedPrev = Math.max(prevRaw, minAllowed);
      cursorPrice =
        Math.round((Number.isFinite(clampedPrev) ? clampedPrev : roundedBase) * 100) / 100;
      points[k - 1] = {
        ts: now - (CONFIG.HISTORY_MAX - k) * CONFIG.PRICE_TICK_MS,
        price: cursorPrice
      };
    }

    state.priceHistory[asset.id] = points;
  });
}

/**
 * Menghitung total estimasi pendapatan per jam dari seluruh aset berimbal hasil (Saham & Properti; Kripto/Forex = 0).
 */
export function getTotalInvestmentHourlyYield() {
  return calculateTotalInvestmentYield(ASSETS, state.holdings, getCurrentAssetPrice);
}

/**
 * Satu siklus pergerakan harga pasar (setiap 3 detik) menggunakan random walk terukur.
 */
export function runPriceTick() {
  const now = Date.now();
  ASSETS.forEach(function (asset) {
    const current = getCurrentAssetPrice(asset.id);
    const minAllowed = asset.initialPrice * CONFIG.MIN_PRICE_FACTOR;
    const change =
      (Math.random() - CONFIG.RANDOM_WALK_CENTER) *
      CONFIG.RANDOM_WALK_SPREAD *
      asset.volatility;
    const candidate = current * (1 + change);
    const safeCandidate = Number.isFinite(candidate) ? candidate : current;
    const nextPrice = Math.round(Math.max(safeCandidate, minAllowed) * 100) / 100;

    state.lastPrices[asset.id] = nextPrice;

    if (!Array.isArray(state.priceHistory[asset.id])) {
      state.priceHistory[asset.id] = [];
    }
    state.priceHistory[asset.id].push({ ts: now, price: nextPrice });
    while (state.priceHistory[asset.id].length > CONFIG.HISTORY_MAX) {
      state.priceHistory[asset.id].shift();
    }
  });

  if (hasDOM && document.visibilityState === 'visible' && state.activeTab === 'Investing') {
    if (state.selectedAssetId) {
      renderAssetDetailScreen();
    } else {
      renderInvestingScreen();
    }
  }

  saveMarketPricesThrottled();
}

/**
 * Menghitung persentase perubahan harga aset terhadap titik awal riwayat.
 */
export function getAssetChangePercent(assetId) {
  const history = state.priceHistory[assetId];
  if (!Array.isArray(history) || history.length === 0) {
    return 0;
  }
  const firstPrice = Number(history[0].price);
  const currentPrice = getCurrentAssetPrice(assetId);
  if (!Number.isFinite(firstPrice) || firstPrice <= 0 || !Number.isFinite(currentPrice)) {
    return 0;
  }
  const pct = ((currentPrice - firstPrice) / firstPrice) * 100;
  return Number.isFinite(pct) ? pct : 0;
}

/**
 * Menghitung ringkasan nilai portofolio, P&L, dan pendapatan/jam untuk satu kategori.
 * Aset Kripto dan Forex selalu memiliki hourlyYield = 0.
 */
export function getCategorySummary(category) {
  return calculateCategoryValuation(category, ASSETS, state.holdings, getCurrentAssetPrice);
}

const INVEST_CATEGORIES = ['Saham', 'Kripto', 'Forex'];
const CATEGORY_META = {
  Saham: {
    subtitle: 'Ekuitas',
    color: '#2563EB',
    portfolioTitle: 'Portofolio Saham Saya',
    portfolioLabel: 'Nilai portofolio saham',
    ownedTitle: 'Saham Saya',
    emptyText: 'Belum ada saham yang dibeli.'
  },
  Kripto: {
    subtitle: 'Aset Digital',
    color: '#EA580C',
    portfolioTitle: 'Portofolio Kripto Saya',
    portfolioLabel: 'Nilai portofolio kripto',
    ownedTitle: 'Kripto Saya',
    emptyText: 'Belum ada aset kripto yang dibeli.'
  },
  Forex: {
    subtitle: 'Mata Uang',
    color: '#7C3AED',
    portfolioTitle: 'Portofolio Forex Saya',
    portfolioLabel: 'Nilai portofolio forex',
    ownedTitle: 'Forex Saya',
    emptyText: 'Belum ada pasangan forex yang dibeli.'
  }
};
const SHELF_TRACKS = {
  Saham: shelfTrackSaham,
  Kripto: shelfTrackKripto,
  Forex: shelfTrackForex
};
const CAT_CARD_SUBS = {
  Saham: catCardSubSaham,
  Kripto: catCardSubKripto,
  Forex: catCardSubForex
};
const CAT_CARD_TOTALS = {
  Saham: catCardTotalSaham,
  Kripto: catCardTotalKripto,
  Forex: catCardTotalForex
};
const CAT_CARD_SHARES = {
  Saham: catCardShareSaham,
  Kripto: catCardShareKripto,
  Forex: catCardShareForex
};
const LEGEND_VALS = {
  Saham: legendValSaham,
  Kripto: legendValKripto,
  Forex: legendValForex
};
const LEGEND_SHARES = {
  Saham: legendShareSaham,
  Kripto: legendShareKripto,
  Forex: legendShareForex
};

let activeCategoryScreen = null;
let isOwnedScreenOpen = false;
let activeLegendCategory = null;
let hoveredLegendCategory = null;

/**
 * Menghitung ringkasan portofolio lintas kelas aset secara real-time (nilai, P&L,
 * alokasi, kelas aktif, dan kelas terbesar) dari kepemilikan pemain yang asli.
 */
export function getPortfolioAllocation() {
  return calculateLivePortfolioSnapshot(
    INVEST_CATEGORIES,
    ASSETS,
    state.holdings,
    getCurrentAssetPrice
  );
}

/**
 * Memformat bobot alokasi satu desimal, mis. "45.0%" (en-US).
 */
function formatSharePercent(share) {
  const safe = Number.isFinite(share) ? share : 0;
  return safe.toFixed(CONFIG.ALLOC_DECIMALS) + '%';
}

let donutBuilt = false;
const donutSegmentEls = [];
const donutAnimState = {
  rafId: null,
  pulseTimer: null,
  initialized: false,
  currentTotal: 0,
  targetTotal: 0,
  currentFractions: INVEST_CATEGORIES.map(function () {
    return 0;
  }),
  targetFractions: INVEST_CATEGORIES.map(function () {
    return 0;
  }),
  currentShares: INVEST_CATEGORIES.map(function () {
    return 0;
  }),
  targetShares: INVEST_CATEGORIES.map(function () {
    return 0;
  }),
  currentCategoryTotals: INVEST_CATEGORIES.map(function () {
    return 0;
  }),
  targetCategoryTotals: INVEST_CATEGORIES.map(function () {
    return 0;
  })
};

/**
 * Menghentikan animasi donat distribusi portofolio yang sedang berjalan.
 */
function cancelDonutAnimation() {
  if (donutAnimState.rafId !== null && typeof root.cancelAnimationFrame === 'function') {
    root.cancelAnimationFrame(donutAnimState.rafId);
  }
  donutAnimState.rafId = null;
}

/**
 * Menyelaraskan sorotan segmen donat, legenda interaktif, dan teks tengah donat.
 */
function syncDonutHighlightUI() {
  const focusedCat = hoveredLegendCategory || activeLegendCategory;
  const focusedIdx = focusedCat ? INVEST_CATEGORIES.indexOf(focusedCat) : 0;
  const hasFocus = Boolean(focusedCat && focusedIdx >= 0);

  if (donutBuilt) {
    INVEST_CATEGORIES.forEach(function (cat, idx) {
      const segment = donutSegmentEls[idx];
      if (!segment) return;
      segment.classList.toggle('is-active', Boolean(hasFocus && cat === focusedCat));
      segment.classList.toggle('is-dimmed', Boolean(hasFocus && cat !== focusedCat));
    });
  }

  legendItems.forEach(function (btn) {
    const cat = btn.getAttribute('data-legend-category');
    const isPressed = Boolean(activeLegendCategory && cat === activeLegendCategory);
    const isHighlighted = Boolean(hasFocus && cat === focusedCat);
    const isDimmed = Boolean(hasFocus && cat !== focusedCat);
    btn.classList.toggle('is-active', isHighlighted);
    btn.classList.toggle('is-dimmed', isDimmed);
    btn.setAttribute('aria-pressed', String(isPressed));
  });

  if (hasFocus) {
    const catVal = donutAnimState.currentCategoryTotals[focusedIdx] || 0;
    const catShare = donutAnimState.currentShares[focusedIdx] || 0;
    if (allocCenterLabel) {
      allocCenterLabel.textContent = focusedCat.toUpperCase();
    }
    if (allocCenterTotal) {
      allocCenterTotal.textContent = formatUsdCompact(catVal);
      allocCenterTotal.title = formatUsdFull(catVal);
    }
    if (allocCenterSub) {
      allocCenterSub.textContent = formatSharePercent(catShare) + ' PORTOFOLIO';
    }
  } else {
    const totalVal = donutAnimState.currentTotal || 0;
    if (allocCenterLabel) {
      allocCenterLabel.textContent = 'TOTAL NILAI';
    }
    if (allocCenterTotal) {
      allocCenterTotal.textContent = formatUsdCompact(totalVal);
      allocCenterTotal.title = formatUsdFull(totalVal);
    }
    if (allocCenterSub) {
      allocCenterSub.textContent = 'LANGSUNG \u00B7 3 dtk';
    }
  }
}

/**
 * Mengatur atau membalikkan pilihan kategori aktif pada legenda & segmen donat.
 */
function toggleLegendCategory(cat) {
  if (!cat || INVEST_CATEGORIES.indexOf(cat) < 0) return;
  activeLegendCategory = activeLegendCategory === cat ? null : cat;
  syncDonutHighlightUI();
}

/**
 * Membangun segmen donat satu kali (Saham, Kripto, Forex).
 */
function ensureDonutSkeleton() {
  if (donutBuilt || !donutSegmentsGroup) return;
  const circumference = Math.PI * CONFIG.FULL_CIRCLE_TURNS * CONFIG.DONUT_RADIUS;
  INVEST_CATEGORIES.forEach(function (cat) {
    const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    segment.setAttribute('class', 'donut-segment');
    segment.setAttribute('data-donut-category', cat);
    segment.setAttribute('tabindex', '0');
    segment.setAttribute('role', 'button');
    segment.setAttribute('aria-label', 'Sorot kelas aset ' + cat);
    segment.setAttribute('cx', '110');
    segment.setAttribute('cy', '110');
    segment.setAttribute('r', String(CONFIG.DONUT_RADIUS));
    segment.setAttribute('stroke', CATEGORY_META[cat].color);
    segment.setAttribute('stroke-dasharray', '0 ' + String(circumference));
    segment.setAttribute('stroke-dashoffset', '0');
    donutSegmentsGroup.appendChild(segment);
    donutSegmentEls.push(segment);
  });
  donutBuilt = true;
}

/**
 * Menerapkan satu frame segmen donat, total nilai tengah, dan persentase distribusi kategori.
 */
function applyDonutFrame(fractions, totalVal, shares, categoryTotals) {
  ensureDonutSkeleton();
  const circumference = Math.PI * CONFIG.FULL_CIRCLE_TURNS * CONFIG.DONUT_RADIUS;
  let offset = 0;

  if (donutBuilt) {
    INVEST_CATEGORIES.forEach(function (_cat, idx) {
      const segment = donutSegmentEls[idx];
      if (!segment) return;
      const frac = Math.max(0, Math.min(1, fractions[idx] || 0));
      const length = circumference * frac;
      const remainder = Math.max(0, circumference - length);
      segment.setAttribute('stroke-dasharray', String(length) + ' ' + String(remainder));
      segment.setAttribute('stroke-dashoffset', String(-offset));
      offset += length;
    });
  }

  INVEST_CATEGORIES.forEach(function (cat, idx) {
    const shareText = formatSharePercent(shares[idx]);
    const catVal = categoryTotals ? categoryTotals[idx] || 0 : 0;
    if (CAT_CARD_SHARES[cat]) {
      CAT_CARD_SHARES[cat].textContent = shareText + ' portofolio';
    }
    if (LEGEND_SHARES[cat]) {
      LEGEND_SHARES[cat].textContent = shareText;
    }
    if (LEGEND_VALS[cat]) {
      LEGEND_VALS[cat].textContent = formatUsdCompact(catVal);
      LEGEND_VALS[cat].title = formatUsdFull(catVal);
    }
  });

  syncDonutHighlightUI();
}

function triggerDonutPulse(direction) {
  if (donutWrap) {
    donutWrap.classList.remove('is-updating');
    void donutWrap.offsetWidth;
    donutWrap.classList.add('is-updating');
  }
  if (allocCenterTotal) {
    allocCenterTotal.classList.remove('is-up', 'is-down');
    if (direction !== 'flat') {
      void allocCenterTotal.offsetWidth;
      allocCenterTotal.classList.add(direction === 'up' ? 'is-up' : 'is-down');
    }
  }
  if (donutAnimState.pulseTimer !== null) {
    clearTimeout(donutAnimState.pulseTimer);
  }
  donutAnimState.pulseTimer = setTimeout(function () {
    donutAnimState.pulseTimer = null;
    if (donutWrap) donutWrap.classList.remove('is-updating');
    if (allocCenterTotal) allocCenterTotal.classList.remove('is-up', 'is-down');
  }, CONFIG.DONUT_PULSE_MS);
}

/**
 * Memperbarui segmen donat dan persentase distribusi dengan transisi halus saat nilai berubah.
 */
function updateDonut(allocation) {
  ensureDonutSkeleton();

  const targetTotal = Number.isFinite(allocation.total) ? allocation.total : 0;
  const targetCategoryTotals = INVEST_CATEGORIES.map(function (cat) {
    const val = allocation.byCategory[cat].totalValue;
    return Number.isFinite(val) ? val : 0;
  });
  const targetFractions = targetCategoryTotals.map(function (val) {
    return targetTotal > 0 ? val / targetTotal : 0;
  });
  const targetShares = targetFractions.map(function (frac) {
    return frac * 100;
  });

  const prevTargetTotal = donutAnimState.targetTotal;
  const totalChanged = Math.abs(targetTotal - prevTargetTotal) > CONFIG.DONUT_EPSILON;
  const fractionsChanged = targetFractions.some(function (frac, idx) {
    return Math.abs(frac - donutAnimState.targetFractions[idx]) > CONFIG.DONUT_EPSILON;
  });
  const hasChanged = totalChanged || fractionsChanged;

  const prefersReduced =
    hasDOM &&
    typeof root.matchMedia === 'function' &&
    root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate =
    hasDOM && typeof root.requestAnimationFrame === 'function' && !prefersReduced;

  const fromTotal = donutAnimState.initialized ? donutAnimState.currentTotal : 0;
  const fromFractions = donutAnimState.initialized
    ? donutAnimState.currentFractions.slice()
    : targetFractions.map(function () {
        return 0;
      });
  const fromShares = donutAnimState.initialized
    ? donutAnimState.currentShares.slice()
    : targetShares.map(function () {
        return 0;
      });
  const fromCategoryTotals = donutAnimState.initialized
    ? donutAnimState.currentCategoryTotals.slice()
    : targetCategoryTotals.map(function () {
        return 0;
      });

  donutAnimState.targetTotal = targetTotal;
  donutAnimState.targetFractions = targetFractions.slice();
  donutAnimState.targetShares = targetShares.slice();
  donutAnimState.targetCategoryTotals = targetCategoryTotals.slice();

  const shouldAnimate =
    canAnimate &&
    (donutAnimState.initialized ? hasChanged : targetTotal > 0);

  if (!shouldAnimate) {
    cancelDonutAnimation();
    donutAnimState.initialized = true;
    donutAnimState.currentTotal = targetTotal;
    donutAnimState.currentFractions = targetFractions.slice();
    donutAnimState.currentShares = targetShares.slice();
    donutAnimState.currentCategoryTotals = targetCategoryTotals.slice();
    applyDonutFrame(targetFractions, targetTotal, targetShares, targetCategoryTotals);
    return;
  }

  if (donutAnimState.initialized && hasChanged) {
    const direction =
      targetTotal > prevTargetTotal
        ? 'up'
        : targetTotal < prevTargetTotal
          ? 'down'
          : 'flat';
    triggerDonutPulse(direction);
  }

  donutAnimState.initialized = true;
  cancelDonutAnimation();

  const startTs =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  function stepDonut(nowTs) {
    const rawProgress = (nowTs - startTs) / CONFIG.DONUT_ANIM_DURATION_MS;
    const clamped = Math.max(0, Math.min(1, rawProgress));
    const eased = 1 - Math.pow(1 - clamped, CONFIG.CHART_EASE_POWER);

    const frameTotal = fromTotal + (targetTotal - fromTotal) * eased;
    const frameFractions = targetFractions.map(function (targetFrac, idx) {
      return fromFractions[idx] + (targetFrac - fromFractions[idx]) * eased;
    });
    const frameShares = targetShares.map(function (targetShare, idx) {
      return fromShares[idx] + (targetShare - fromShares[idx]) * eased;
    });
    const frameCategoryTotals = targetCategoryTotals.map(function (targetCatVal, idx) {
      return fromCategoryTotals[idx] + (targetCatVal - fromCategoryTotals[idx]) * eased;
    });

    donutAnimState.currentTotal = frameTotal;
    donutAnimState.currentFractions = frameFractions;
    donutAnimState.currentShares = frameShares;
    donutAnimState.currentCategoryTotals = frameCategoryTotals;
    applyDonutFrame(frameFractions, frameTotal, frameShares, frameCategoryTotals);

    if (clamped < 1) {
      donutAnimState.rafId = root.requestAnimationFrame(stepDonut);
    } else {
      donutAnimState.rafId = null;
      donutAnimState.currentTotal = targetTotal;
      donutAnimState.currentFractions = targetFractions.slice();
      donutAnimState.currentShares = targetShares.slice();
      donutAnimState.currentCategoryTotals = targetCategoryTotals.slice();
      applyDonutFrame(targetFractions, targetTotal, targetShares, targetCategoryTotals);
    }
  }

  donutAnimState.rafId = root.requestAnimationFrame(stepDonut);
}

let shelvesBuilt = false;
const shelfTiles = [];

/**
 * Membangun strip kartu aset (tile) untuk keempat rak satu kali.
 */
function ensureShelvesBuilt() {
  if (shelvesBuilt) return;
  if (!hasDOM) return;

  INVEST_CATEGORIES.forEach(function (cat) {
    const track = SHELF_TRACKS[cat];
    if (!track) return;

    const categoryAssets = ASSETS.filter(function (asset) {
      return asset.category === cat;
    });

    categoryAssets.forEach(function (asset) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.setAttribute('data-asset-id', asset.id);
      tile.setAttribute('aria-label', 'Beli atau jual ' + asset.name);

      const avatar = document.createElement('span');
      avatar.className = 'tile__avatar';
      if (asset.iconId) {
        avatar.classList.add('tile__avatar--logo');
        avatar.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' +
          asset.iconId +
          '"></use></svg>';
      } else {
        avatar.style.backgroundColor = asset.color;
        avatar.textContent = asset.symbol;
      }

      const infoEl = document.createElement('span');
      infoEl.className = 'tile__info';

      const nameRow = document.createElement('span');
      nameRow.className = 'tile__name-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'tile__name';
      nameEl.textContent = asset.name;

      nameRow.appendChild(nameEl);

      const symbolEl = document.createElement('span');
      symbolEl.className = 'tile__symbol';
      symbolEl.textContent = 'Tersedia';

      infoEl.appendChild(nameRow);
      infoEl.appendChild(symbolEl);

      const rightEl = document.createElement('span');
      rightEl.className = 'tile__right';

      const priceEl = document.createElement('span');
      priceEl.className = 'tile__price';

      const changeEl = document.createElement('span');
      changeEl.className = 'tile__change tile__change--up';

      rightEl.appendChild(priceEl);
      rightEl.appendChild(changeEl);

      tile.appendChild(avatar);
      tile.appendChild(infoEl);
      tile.appendChild(rightEl);
      track.appendChild(tile);

      shelfTiles.push({
        asset: asset,
        tile: tile,
        symbolEl: symbolEl,
        priceEl: priceEl,
        changeEl: changeEl
      });
    });
  });
  shelvesBuilt = true;
}

/**
 * Memformat harga per unit untuk tile: penuh di bawah threshold, ringkas di atasnya.
 */
function formatTilePrice(price) {
  const safe = Number.isFinite(price) ? price : 0;
  if (Math.abs(safe) >= CONFIG.TILE_PRICE_COMPACT_THRESHOLD) {
    return formatUsdCompact(safe);
  }
  return formatUsdFull(safe);
}

/**
 * Memperbarui baris produk pasar pada daftar seluruh produk investasi.
 */
function updateShelves() {
  shelfTiles.forEach(function (entry) {
    const asset = entry.asset;
    const holding = state.holdings[asset.id];
    const units = holding && Number.isFinite(Number(holding.units)) ? Number(holding.units) : 0;
    const currentPrice = getCurrentAssetPrice(asset.id);
    const changePct = getAssetChangePercent(asset.id);
    const isUp = changePct >= 0;
    const hasUnits = units > 0;

    entry.tile.classList.toggle('tile--owned', hasUnits);

    if (entry.symbolEl) {
      entry.symbolEl.textContent = hasUnits
        ? 'Dimiliki \u00B7 ' + formatIntegerID(units) + ' ' + asset.unitLabel
        : 'Tersedia';
    }

    if (entry.priceEl) {
      const previousRaw = entry.tile.dataset.prevPrice;
      const previousPrice = previousRaw ? Number(previousRaw) : Number.NaN;
      if (Number.isFinite(previousPrice) && previousPrice > 0 && previousPrice !== currentPrice) {
        entry.tile.classList.remove('tile--flash-up', 'tile--flash-down');
        void entry.tile.offsetWidth;
        entry.tile.classList.add(
          currentPrice > previousPrice ? 'tile--flash-up' : 'tile--flash-down'
        );
      }
      entry.tile.dataset.prevPrice = String(currentPrice);
      entry.priceEl.textContent = formatTilePrice(currentPrice);
      entry.priceEl.title = formatUsdFull(currentPrice);
    }

    if (entry.changeEl) {
      const absStr = Math.abs(changePct).toFixed(CONFIG.CURRENCY_DECIMALS).replace('.', ',');
      entry.changeEl.className =
        'tile__change ' + (isUp ? 'tile__change--up' : 'tile__change--down');
      entry.changeEl.textContent = (isUp ? '\u25B2 ' : '\u25BC ') + absStr + '%';
    }
  });
}

/**
 * Memperbarui kartu portofolio biru di bagian atas layar daftar produk kategori.
 */
function updateCategoryPortfolioCard(allocation) {
  if (!activeCategoryScreen || !allocation) return;
  const meta = CATEGORY_META[activeCategoryScreen];
  const summary = allocation.byCategory[activeCategoryScreen];
  if (!meta || !summary) return;

  if (catPortfolioTitle) catPortfolioTitle.textContent = meta.portfolioTitle;
  if (catPortfolioLabel) catPortfolioLabel.textContent = meta.portfolioLabel;
  if (catPortfolioValue) {
    catPortfolioValue.textContent = formatUsdFull(summary.totalValue);
  }
  if (catPortfolioPnl) {
    const isPositive = summary.pnlValue >= 0;
    const signPrefix = isPositive ? '+ ' : '- ';
    const absPctStr = Math.abs(summary.pnlPct).toFixed(CONFIG.CURRENCY_DECIMALS).replace('.', ',');
    catPortfolioPnl.textContent =
      signPrefix + formatUsdFull(Math.abs(summary.pnlValue)) + ' (' + absPctStr + '%)';
    catPortfolioPnl.classList.toggle('pnl--positive', isPositive);
    catPortfolioPnl.classList.toggle('pnl--negative', !isPositive);
  }
  if (catPortfolioYieldLabel && catPortfolioYield) {
    if (isCryptoOrForexCategory(activeCategoryScreen)) {
      catPortfolioYieldLabel.textContent = 'Modal diinvestasikan';
      catPortfolioYield.textContent = formatUsdFull(summary.totalCost);
    } else {
      catPortfolioYieldLabel.textContent = 'Perkiraan imbal hasil per jam';
      catPortfolioYield.textContent = formatUsdFull(summary.hourlyYield);
    }
  }
}

/**
 * Merender daftar produk yang dimiliki pemain di layar Portofolio Saya (dalam kartu biru).
 */
function updateOwnedListScreen() {
  if (!hasDOM || !activeCategoryScreen || !ownedListTrack) return;
  const meta = CATEGORY_META[activeCategoryScreen];

  const ownedRows = ASSETS.filter(function (asset) {
    if (asset.category !== activeCategoryScreen) return false;
    const holding = state.holdings[asset.id];
    const units = holding && Number.isFinite(Number(holding.units)) ? Number(holding.units) : 0;
    return units > 0;
  }).map(function (asset) {
    const holding = state.holdings[asset.id];
    const units = Number(holding.units);
    const avgEntry = Number.isFinite(Number(holding.avgEntry)) ? Number(holding.avgEntry) : 0;
    const currentPrice = getCurrentAssetPrice(asset.id);
    const positionValue = units * currentPrice;
    const totalCost = units * avgEntry;
    const rawPct = totalCost > 0 ? ((positionValue - totalCost) / totalCost) * 100 : 0;
    return {
      asset: asset,
      units: units,
      positionValue: positionValue,
      unrealizedPct: Number.isFinite(rawPct) ? rawPct : 0
    };
  });

  ownedRows.sort(function (a, b) {
    return b.positionValue - a.positionValue;
  });

  ownedListTrack.innerHTML = '';
  if (ownedRows.length === 0) {
    if (ownedEmptyText && meta) {
      ownedEmptyText.textContent = meta.emptyText;
    }
    if (ownedEmptyState) ownedEmptyState.hidden = false;
    return;
  }

  if (ownedEmptyState) ownedEmptyState.hidden = true;

  ownedRows.forEach(function (item) {
    const asset = item.asset;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.setAttribute('data-asset-id', asset.id);
    tile.setAttribute('aria-label', 'Buka detail ' + asset.name);

    const avatar = document.createElement('span');
    avatar.className = 'tile__avatar';
    if (asset.iconId) {
      avatar.classList.add('tile__avatar--logo');
      avatar.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' +
        asset.iconId +
        '"></use></svg>';
    } else {
      avatar.style.backgroundColor = asset.color;
      avatar.textContent = asset.symbol;
    }

    const infoEl = document.createElement('span');
    infoEl.className = 'tile__info';

    const nameRow = document.createElement('span');
    nameRow.className = 'tile__name-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'tile__name';
    nameEl.textContent = asset.name;
    nameRow.appendChild(nameEl);

    const unitsEl = document.createElement('span');
    unitsEl.className = 'tile__symbol';
    unitsEl.textContent = formatIntegerID(item.units) + ' ' + asset.unitLabel;

    infoEl.appendChild(nameRow);
    infoEl.appendChild(unitsEl);

    const rightEl = document.createElement('span');
    rightEl.className = 'tile__right';

    const valueEl = document.createElement('span');
    valueEl.className = 'tile__price';
    valueEl.textContent = formatTilePrice(item.positionValue);
    valueEl.title = formatUsdFull(item.positionValue);

    const pnlUp = item.unrealizedPct >= 0;
    const pnlEl = document.createElement('span');
    pnlEl.className = 'tile__change ' + (pnlUp ? 'tile__change--up' : 'tile__change--down');
    pnlEl.textContent = formatSignedPercent(item.unrealizedPct);

    rightEl.appendChild(valueEl);
    rightEl.appendChild(pnlEl);

    tile.appendChild(avatar);
    tile.appendChild(infoEl);
    tile.appendChild(rightEl);
    ownedListTrack.appendChild(tile);
  });
}

/**
 * Merender layar utama Investasi: hero portofolio, alokasi aset, dan daftar kategori.
 */
export function renderInvestingScreen() {
  if (!investingScreen) return;

  const allocation = getPortfolioAllocation();
  const total = allocation.total;
  const hourlyYield = getTotalInvestmentHourlyYield();

  if (heroTotalValue) {
    const useCompactHero = Math.abs(total) >= CONFIG.HERO_COMPACT_THRESHOLD;
    heroTotalValue.textContent = useCompactHero ? formatUsdCompact(total) : formatUsdFull(total);
    heroTotalValue.title = formatUsdFull(total);
  }
  if (heroHourlyYield) {
    heroHourlyYield.textContent = formatUsdCompact(hourlyYield);
    heroHourlyYield.title = formatUsdFull(hourlyYield) + ' per jam';
  }

  updateDonut(allocation);

  INVEST_CATEGORIES.forEach(function (cat) {
    const value = allocation.byCategory[cat].totalValue;
    const assetCount = ASSETS.filter(function (asset) {
      return asset.category === cat;
    }).length;
    if (CAT_CARD_SUBS[cat]) {
      CAT_CARD_SUBS[cat].textContent =
        CATEGORY_META[cat].subtitle + ' \u00B7 ' + formatIntegerID(assetCount) + ' aset';
    }
    if (CAT_CARD_TOTALS[cat]) {
      CAT_CARD_TOTALS[cat].textContent = formatUsdCompact(value);
      CAT_CARD_TOTALS[cat].title = formatUsdFull(value);
    }
  });

  updateCategoryPortfolioCard(allocation);
  ensureShelvesBuilt();
  updateShelves();
  if (isOwnedScreenOpen) {
    updateOwnedListScreen();
  }
}

export function resolveTradeQuantities(currentPrice, ownedUnits) {
  const safePrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0;
  const safeOwned = Number.isFinite(ownedUnits) && ownedUnits > 0 ? Math.floor(ownedUnits) : 0;
  const maxAffordable =
    safePrice > 0 && Number.isFinite(state.balance) && state.balance >= safePrice
      ? Math.floor(state.balance / safePrice)
      : 0;

  if (state.selectedQtyMode === 'max') {
    return {
      buyQty: maxAffordable,
      sellQty: safeOwned,
      maxAffordable: maxAffordable
    };
  }

  const parsed = Number(state.selectedQtyMode);
  const fixedQty = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  return {
    buyQty: fixedQty,
    sellQty: fixedQty,
    maxAffordable: maxAffordable
  };
}

let detailTimeframe = CONFIG.CHART_DEFAULT_TIMEFRAME;
let detailChartMode = 'line';
let detailStatsExpanded = false;
let detailActiveSubTab = 'summary';
let detailHoverCoord = null;

/**
 * Menghentikan animasi grafik yang sedang berjalan (saat menutup layar atau mengganti aset).
 */
export function cancelChartAnimation() {
  cancelDetailChartAnimation();
}

function getSafeHistoryPoints(asset) {
  const rawHistory = Array.isArray(state.priceHistory[asset.id])
    ? state.priceHistory[asset.id]
    : [];
  const fallbackNow = Date.now();
  const fallbackPrice = getCurrentAssetPrice(asset.id);
  const points = rawHistory.filter(function (pt) {
    return pt && Number.isFinite(pt.price) && pt.price > 0;
  });
  if (points.length === 0) {
    return [
      { ts: fallbackNow - CONFIG.PRICE_TICK_MS, price: fallbackPrice },
      { ts: fallbackNow, price: fallbackPrice }
    ];
  }
  if (points.length === 1) {
    return [{ ts: points[0].ts - CONFIG.PRICE_TICK_MS, price: points[0].price }, points[0]];
  }
  return points;
}

/**
 * Menggambar grafik riwayat harga aset di Canvas 2D dengan kurva halus dan pembaruan real-time.
 */
export function renderAssetPriceChart(asset) {
  if (!asset) return;
  const fullHistory = getSafeHistoryPoints(asset);
  renderDetailPriceChart(assetPriceCanvas, asset, fullHistory, {
    timeframe: detailTimeframe,
    chartMode: detailChartMode,
    hoverCoord: detailHoverCoord,
    getSelectedAssetId: function () {
      return state.selectedAssetId;
    }
  });
}

export function getAssetDetailProfile(asset) {
  return buildContinuousMarketProfile(asset);
}

/**
 * Merender informasi layar detail aset yang dipilih beserta grafik Canvas 2D.
 */
export function renderAssetDetailScreen() {
  if (!assetDetailScreen || !state.selectedAssetId) return;
  const asset = getAssetById(state.selectedAssetId);
  if (!asset) return;

  const profile = getAssetDetailProfile(asset);
  const currentPrice = getCurrentAssetPrice(asset.id);
  const fullHistory = getSafeHistoryPoints(asset);
  const viewPoints = sliceTimeframePoints(fullHistory, detailTimeframe);
  const stats = computeSessionStats(viewPoints, fullHistory, asset);
  const market24Metrics = computeContinuousMarketMetrics(asset, stats);
  const changePct = getAssetChangePercent(asset.id);
  const holding = state.holdings[asset.id];
  const units = holding && Number.isFinite(Number(holding.units)) ? Number(holding.units) : 0;
  const avgEntry =
    holding && Number.isFinite(Number(holding.avgEntry)) ? Number(holding.avgEntry) : 0;
  const totalCost = units > 0 ? units * avgEntry : 0;
  const marketValue = units > 0 ? units * currentPrice : 0;
  const unrealizedValue = units > 0 ? marketValue - totalCost : 0;
  const rawPct = totalCost > 0 ? (unrealizedValue / totalCost) * 100 : 0;
  const unrealizedPct = Number.isFinite(rawPct) ? rawPct : 0;
  const assetHourlyYield = calculateAssetHourlyYield(asset, units, currentPrice);

  if (detailAssetAvatar && detailAssetAvatar.dataset.assetId !== asset.id) {
    detailAssetAvatar.dataset.assetId = asset.id;
    detailAssetAvatar.className = 'detail-asset-avatar';
    if (asset.iconId) {
      detailAssetAvatar.classList.add('detail-asset-avatar--logo');
      detailAssetAvatar.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' +
        asset.iconId +
        '"></use></svg>';
    } else {
      detailAssetAvatar.style.backgroundColor = asset.color;
      detailAssetAvatar.textContent = asset.symbol;
    }
  }

  if (detailAssetSymbol) detailAssetSymbol.textContent = profile.displaySymbol;
  if (detailAssetName) detailAssetName.textContent = profile.displaySubtitle;
  if (detailAssetCategory) detailAssetCategory.textContent = asset.category;
  if (detailSessionTag) detailSessionTag.hidden = !profile.showSessionTag;
  if (detailMetaStrip) detailMetaStrip.hidden = !profile.showMetaStrip;

  if (detailMarketPriceHero) {
    const prevAssetId = detailMarketPriceHero.dataset.assetId;
    const prevHeroPrice = Number(detailMarketPriceHero.dataset.lastPrice);
    if (prevAssetId === asset.id && Number.isFinite(prevHeroPrice) && prevHeroPrice !== currentPrice) {
      detailMarketPriceHero.classList.remove('detail-price-flash--up', 'detail-price-flash--down');
      void detailMarketPriceHero.offsetWidth;
      detailMarketPriceHero.classList.add(
        currentPrice > prevHeroPrice ? 'detail-price-flash--up' : 'detail-price-flash--down'
      );
    } else if (prevAssetId !== asset.id) {
      detailMarketPriceHero.classList.remove('detail-price-flash--up', 'detail-price-flash--down');
    }
    detailMarketPriceHero.dataset.assetId = asset.id;
    detailMarketPriceHero.dataset.lastPrice = String(currentPrice);
    detailMarketPriceHero.textContent = formatTilePrice(currentPrice);
    detailMarketPriceHero.title = formatUsdFull(currentPrice);
  }

  if (detailPriceChange) {
    const up = stats.deltaValue >= 0;
    const arrow = up ? '\u25B2 ' : '\u25BC ';
    const deltaStr = formatTilePrice(Math.abs(stats.deltaValue));
    const pctStr = formatSignedPercent(stats.deltaPct);
    detailPriceChange.textContent = arrow + deltaStr + ' (' + pctStr + ')';
    detailPriceChange.classList.toggle('pnl--positive', up);
    detailPriceChange.classList.toggle('pnl--negative', !up);
  }

  if (detailOpenRef) {
    detailOpenRef.textContent = formatTilePrice(asset.initialPrice);
    detailOpenRef.title = formatUsdFull(asset.initialPrice);
  }
  if (detailSessionDelta) {
    const sessionUp = changePct >= 0;
    const arrow = sessionUp ? '\u25B2 ' : '\u25BC ';
    detailSessionDelta.textContent = arrow + formatSignedPercent(changePct);
    detailSessionDelta.classList.toggle('pnl--positive', sessionUp);
    detailSessionDelta.classList.toggle('pnl--negative', !sessionUp);
  }
  if (detailLastUpdate) {
    const latestPoint = fullHistory[fullHistory.length - 1];
    detailLastUpdate.textContent = 'Pembaruan ' + formatTimeHHMM(latestPoint ? latestPoint.ts : Date.now());
  }

  const volLabel = market24Metrics.volatilityLabel;

  if (detailStatsToggle) {
    detailStatsToggle.setAttribute('aria-expanded', String(detailStatsExpanded));
    detailStatsToggle.classList.toggle(
      'detail-stats-drawer__toggle--grid',
      profile.isContinuousMarket && detailStatsExpanded
    );
  }
  if (profile.isContinuousMarket) {
    if (detailStatsSummary) detailStatsSummary.hidden = detailStatsExpanded;
    if (detailStatsGrid24) detailStatsGrid24.hidden = !detailStatsExpanded;
    if (detailStatsExtra) detailStatsExtra.hidden = true;
    if (detailStatOpenWrap) detailStatOpenWrap.hidden = true;
  } else {
    if (detailStatsSummary) detailStatsSummary.hidden = false;
    if (detailStatsGrid24) detailStatsGrid24.hidden = true;
    if (detailStatsExtra) detailStatsExtra.hidden = !detailStatsExpanded;
    if (detailStatOpenWrap) detailStatOpenWrap.hidden = false;
  }

  if (detailStatOpen) detailStatOpen.textContent = formatTilePrice(stats.open);
  if (detailStatHigh) {
    detailStatHigh.textContent = formatTilePrice(
      profile.isContinuousMarket ? market24Metrics.high24h : stats.high
    );
  }
  if (detailStatLow) {
    detailStatLow.textContent = formatTilePrice(
      profile.isContinuousMarket ? market24Metrics.low24h : stats.low
    );
  }
  if (detailStat24High) detailStat24High.textContent = formatTilePrice(market24Metrics.high24h);
  if (detailStat24Low) detailStat24Low.textContent = formatTilePrice(market24Metrics.low24h);
  if (detailStat24Vol) detailStat24Vol.textContent = volLabel;
  if (detailStat24ExtraLabel) detailStat24ExtraLabel.textContent = market24Metrics.extraStatLabel;
  if (detailStat24ExtraVal) {
    detailStat24ExtraVal.textContent = formatTilePrice(market24Metrics.extraStatValue);
  }

  if (detailStatSessionHigh) detailStatSessionHigh.textContent = formatTilePrice(stats.sessionHigh);
  if (detailStatSessionLow) detailStatSessionLow.textContent = formatTilePrice(stats.sessionLow);
  if (detailStatDrawerYieldItem) detailStatDrawerYieldItem.hidden = !profile.hasDividends;
  if (detailStatYieldRate) {
    const yieldPct = asset.yieldRate * 100;
    detailStatYieldRate.textContent =
      yieldPct.toFixed(CONFIG.CURRENCY_DECIMALS).replace('.', ',') + '%';
  }
  if (detailStatVolatility) detailStatVolatility.textContent = volLabel;

  detailTimeframeBtns.forEach(function (btn) {
    const active = btn.getAttribute('data-timeframe') === detailTimeframe;
    btn.classList.toggle('timeframe-btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  detailChartModeBtns.forEach(function (btn) {
    const active = btn.getAttribute('data-chart-mode') === detailChartMode;
    btn.classList.toggle('chart-mode-btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  detailSubtabs.forEach(function (tab) {
    const active = tab.getAttribute('data-detail-tab') === detailActiveSubTab;
    tab.classList.toggle('detail-subtab--active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (detailPanelSummary) detailPanelSummary.hidden = detailActiveSubTab !== 'summary';
  if (detailPanelHoldings) detailPanelHoldings.hidden = detailActiveSubTab !== 'holdings';
  if (detailPanelStats) detailPanelStats.hidden = detailActiveSubTab !== 'stats';

  if (detailWalletBalance) {
    detailWalletBalance.textContent = formatUsdCompact(state.balance);
    detailWalletBalance.title = formatUsdFull(state.balance);
  }
  if (detailSummaryOwned) {
    detailSummaryOwned.textContent = formatIntegerID(units) + ' ' + asset.unitLabel;
  }
  if (detailSummaryValue) {
    detailSummaryValue.textContent = formatUsdFull(marketValue);
  }
  if (detailSummaryPnl) {
    const pos = unrealizedValue >= 0;
    const prefix = unrealizedValue > 0 ? '+' : '';
    detailSummaryPnl.textContent =
      prefix +
      formatUsdCompact(unrealizedValue) +
      ' (' +
      formatSignedPercent(unrealizedPct) +
      ')';
    detailSummaryPnl.classList.toggle('pnl--positive', pos);
    detailSummaryPnl.classList.toggle('pnl--negative', !pos);
  }

  if (detailOwnedUnits) {
    detailOwnedUnits.textContent = formatIntegerID(units) + ' ' + asset.unitLabel;
  }
  if (detailMarketPrice) {
    detailMarketPrice.textContent = formatUsdFull(currentPrice);
  }
  if (detailAvgEntry) {
    detailAvgEntry.textContent = units > 0 ? formatUsdFull(avgEntry) : '—';
  }
  if (detailMarketValue) {
    detailMarketValue.textContent = formatUsdFull(marketValue);
  }
  if (detailTotalCost) {
    detailTotalCost.textContent = formatUsdFull(totalCost);
  }
  if (detailUnrealizedPnl) {
    const pos = unrealizedValue >= 0;
    const prefix = unrealizedValue > 0 ? '+' : '';
    detailUnrealizedPnl.textContent =
      prefix +
      formatUsdCompact(unrealizedValue) +
      ' (' +
      formatSignedPercent(unrealizedPct) +
      ')';
    detailUnrealizedPnl.classList.toggle('pnl--positive', pos);
    detailUnrealizedPnl.classList.toggle('pnl--negative', !pos);
  }
  if (detailYieldRow && detailHourlyYield) {
    if (asset.yieldRate > 0) {
      detailYieldRow.hidden = false;
      detailHourlyYield.textContent = formatUsdCompact(assetHourlyYield) + '/jam';
      detailHourlyYield.title = formatUsdFull(assetHourlyYield) + ' per jam';
    } else {
      detailYieldRow.hidden = true;
    }
  }

  if (detailStatTabCategory) detailStatTabCategory.textContent = asset.category;
  if (detailStatTabSymbol) detailStatTabSymbol.textContent = asset.symbol || asset.name;
  if (detailStatTabUnit) detailStatTabUnit.textContent = asset.unitLabel;
  if (detailStatInitialLabel) detailStatInitialLabel.textContent = profile.initialPriceLabel;
  if (detailStatTabInitial) detailStatTabInitial.textContent = formatUsdFull(asset.initialPrice);
  if (detailStatTabVolatility) {
    detailStatTabVolatility.textContent = volLabel;
  }
  if (detailStatYieldRow) {
    detailStatYieldRow.hidden = !profile.hasDividends;
  }
  if (detailStatTabYield) {
    const yieldPctTab = asset.yieldRate * 100;
    detailStatTabYield.textContent =
      yieldPctTab.toFixed(CONFIG.CURRENCY_DECIMALS).replace('.', ',') + '%/jam';
  }

  // Status tombol Beli sesuai kecukupan saldo saat ini
  const trade = resolveTradeQuantities(currentPrice, units);
  const estBuyCost = trade.buyQty * currentPrice;
  const canBuy =
    trade.buyQty >= 1 &&
    Number.isFinite(estBuyCost) &&
    estBuyCost > 0 &&
    state.balance >= estBuyCost;

  if (detailBuyBtn) {
    detailBuyBtn.disabled = !canBuy;
  }

  renderAssetPriceChart(asset);
}
/**
 * Membeli aset secara atomik menggunakan saldo dompet pemain.
 * Mengembalikan true jika transaksi berhasil, false jika dibatalkan.
 */
export function buyAsset(assetId, requestedQty) {
  const asset = getAssetById(assetId);
  if (!asset) return false;

  const currentPrice = getCurrentAssetPrice(asset.id);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;

  const existing = state.holdings[asset.id];
  const oldUnits =
    existing && Number.isFinite(Number(existing.units)) && Number(existing.units) > 0
      ? Math.floor(Number(existing.units))
      : 0;
  const oldAvg =
    existing && Number.isFinite(Number(existing.avgEntry)) && Number(existing.avgEntry) >= 0
      ? Number(existing.avgEntry)
      : 0;

  const qty =
    requestedQty !== undefined
      ? Math.floor(Number(requestedQty))
      : resolveTradeQuantities(currentPrice, oldUnits).buyQty;

  if (!Number.isFinite(qty) || qty < 1) return false;

  const cost = Math.round(qty * currentPrice * 100) / 100;
  if (!Number.isFinite(cost) || cost <= 0 || state.balance < cost) {
    return false;
  }

  const newUnits = oldUnits + qty;
  const rawNewAvg = (oldUnits * oldAvg + qty * currentPrice) / newUnits;
  const newAvg = Number.isFinite(rawNewAvg) ? Math.round(rawNewAvg * 100) / 100 : currentPrice;

  state.balance = Math.max(0, Math.round((state.balance - cost) * 100) / 100);
  state.holdings[asset.id] = {
    units: newUnits,
    avgEntry: newAvg
  };

  saveState({ syncImmediately: true });
  renderStats();
  renderUpgrades();
  renderInvestingScreen();
  if (state.selectedAssetId === asset.id) {
    renderAssetDetailScreen();
  }
  triggerHaptic();
  playCoinBlip();
  showToast('Transaksi Investasi', 'Beli ' + formatIntegerID(qty) + ' ' + asset.name + ' berhasil');
  return true;
}

/**
 * Menjual aset yang dimiliki secara atomik dan menambahkannya ke saldo dompet pemain.
 * Mengembalikan true jika transaksi berhasil, false jika dibatalkan.
 */
export function sellAsset(assetId, requestedQty) {
  const asset = getAssetById(assetId);
  if (!asset) return false;

  const existing = state.holdings[asset.id];
  const oldUnits =
    existing && Number.isFinite(Number(existing.units)) && Number(existing.units) > 0
      ? Math.floor(Number(existing.units))
      : 0;
  const oldAvg =
    existing && Number.isFinite(Number(existing.avgEntry)) && Number(existing.avgEntry) >= 0
      ? Number(existing.avgEntry)
      : 0;

  if (oldUnits < 1) return false;

  const currentPrice = getCurrentAssetPrice(asset.id);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;

  const qty =
    requestedQty !== undefined
      ? Math.floor(Number(requestedQty))
      : resolveTradeQuantities(currentPrice, oldUnits).sellQty;

  if (!Number.isFinite(qty) || qty < 1 || qty > oldUnits) {
    return false;
  }

  const proceeds = Math.round(qty * currentPrice * 100) / 100;
  if (!Number.isFinite(proceeds) || proceeds < 0) return false;

  const realizedProfit = qty * (currentPrice - oldAvg);
  state.balance = Math.round((state.balance + proceeds) * 100) / 100;
  if (Number.isFinite(realizedProfit) && realizedProfit > 0) {
    state.totalEarned = Math.round((state.totalEarned + realizedProfit) * 100) / 100;
  }

  const remainingUnits = oldUnits - qty;
  if (remainingUnits <= 0) {
    delete state.holdings[asset.id];
  } else {
    state.holdings[asset.id] = {
      units: remainingUnits,
      avgEntry: oldAvg
    };
  }

  saveState({ syncImmediately: true });
  renderStats();
  renderUpgrades();
  renderInvestingScreen();
  if (state.selectedAssetId === asset.id) {
    renderAssetDetailScreen();
  }
  checkMilestones();
  triggerHaptic();
  playCoinBlip();
  showToast('Transaksi Investasi', 'Jual ' + formatIntegerID(qty) + ' ' + asset.name + ' berhasil');
  return true;
}

export function openCategoryScreen(category) {
  if (!INVEST_CATEGORIES.includes(category) || !investingCategoryScreen || !investingScreen) return;
  activeCategoryScreen = category;
  isOwnedScreenOpen = false;
  if (investingOwnedScreen) {
    investingOwnedScreen.hidden = true;
    investingOwnedScreen.classList.remove('screen--active');
  }
  categoryShelves.forEach(function (shelf) {
    shelf.hidden = shelf.getAttribute('data-shelf') !== category;
  });
  investingScreen.hidden = true;
  investingScreen.classList.remove('screen--active');
  investingCategoryScreen.hidden = false;
  investingCategoryScreen.classList.add('screen--active');
  if (categoryBody) {
    categoryBody.scrollTop = 0;
  }
  renderInvestingScreen();
}

export function closeCategoryScreen() {
  activeCategoryScreen = null;
  isOwnedScreenOpen = false;
  if (investingOwnedScreen) {
    investingOwnedScreen.hidden = true;
    investingOwnedScreen.classList.remove('screen--active');
  }
  if (investingCategoryScreen) {
    investingCategoryScreen.hidden = true;
    investingCategoryScreen.classList.remove('screen--active');
  }
  if (investingScreen && state.activeTab === 'Investing') {
    investingScreen.hidden = false;
    investingScreen.classList.add('screen--active');
    renderInvestingScreen();
  }
}

export function openOwnedScreen() {
  if (!activeCategoryScreen || !investingOwnedScreen || !investingCategoryScreen) return;
  isOwnedScreenOpen = true;
  investingCategoryScreen.hidden = true;
  investingCategoryScreen.classList.remove('screen--active');
  investingOwnedScreen.hidden = false;
  investingOwnedScreen.classList.add('screen--active');
  if (ownedBody) {
    ownedBody.scrollTop = 0;
  }
  updateOwnedListScreen();
}

export function closeOwnedScreen() {
  isOwnedScreenOpen = false;
  if (investingOwnedScreen) {
    investingOwnedScreen.hidden = true;
    investingOwnedScreen.classList.remove('screen--active');
  }
  if (activeCategoryScreen && investingCategoryScreen && state.activeTab === 'Investing') {
    investingCategoryScreen.hidden = false;
    investingCategoryScreen.classList.add('screen--active');
    renderInvestingScreen();
  }
}

export function resetInvestingNavigation() {
  resetDetailChartState();
  detailHoverCoord = null;
  activeCategoryScreen = null;
  isOwnedScreenOpen = false;
  if (investingOwnedScreen) {
    investingOwnedScreen.hidden = true;
    investingOwnedScreen.classList.remove('screen--active');
  }
  if (investingCategoryScreen) {
    investingCategoryScreen.hidden = true;
    investingCategoryScreen.classList.remove('screen--active');
  }
}

/**
 * Membuka layar detail aset dengan grafik kurva halus.
 */
export function openAssetDetail(assetId) {
  const asset = getAssetById(assetId);
  if (!asset || !assetDetailScreen || !investingScreen) return;
  resetDetailChartState();
  detailHoverCoord = null;
  detailStatsExpanded = getAssetDetailProfile(asset).defaultStatsExpanded;
  detailActiveSubTab = 'summary';
  if (detailChartTooltip) detailChartTooltip.hidden = true;
  state.selectedAssetId = asset.id;
  state.selectedQtyMode = CONFIG.DEFAULT_TRADE_QTY;
  investingScreen.hidden = true;
  investingScreen.classList.remove('screen--active');
  if (investingCategoryScreen) {
    investingCategoryScreen.hidden = true;
    investingCategoryScreen.classList.remove('screen--active');
  }
  if (investingOwnedScreen) {
    investingOwnedScreen.hidden = true;
    investingOwnedScreen.classList.remove('screen--active');
  }
  assetDetailScreen.hidden = false;
  assetDetailScreen.classList.add('screen--active');
  assetDetailScreen.classList.remove('is-entering');
  void assetDetailScreen.offsetWidth;
  assetDetailScreen.classList.add('is-entering');
  const detailBodyEl = getEl('detail-body');
  if (detailBodyEl) {
    detailBodyEl.scrollTop = 0;
  }
  renderAssetDetailScreen();
}

/**
 * Menutup layar detail aset dan kembali ke daftar dimiliki, kategori, atau dasbor investasi.
 */
export function closeAssetDetail() {
  resetDetailChartState();
  detailHoverCoord = null;
  if (detailChartTooltip) detailChartTooltip.hidden = true;
  state.selectedAssetId = null;
  if (assetDetailScreen) {
    assetDetailScreen.hidden = true;
    assetDetailScreen.classList.remove('screen--active', 'is-entering');
  }
  if (state.activeTab === 'Investing') {
    if (isOwnedScreenOpen && activeCategoryScreen && investingOwnedScreen) {
      investingOwnedScreen.hidden = false;
      investingOwnedScreen.classList.add('screen--active');
      renderInvestingScreen();
    } else if (activeCategoryScreen && investingCategoryScreen) {
      investingCategoryScreen.hidden = false;
      investingCategoryScreen.classList.add('screen--active');
      renderInvestingScreen();
    } else if (investingScreen) {
      investingScreen.hidden = false;
      investingScreen.classList.add('screen--active');
      renderInvestingScreen();
    }
  }
}

/**
 * Mendaftarkan seluruh event listener khusus tab Investasi (kartu kategori, portofolio, & detail aset).
 */
export function bindInvestingEvents() {
  if (!hasDOM) return;

  legendItems.forEach(function (btn) {
    const cat = btn.getAttribute('data-legend-category');
    if (!cat) return;

    btn.addEventListener('click', function () {
      toggleLegendCategory(cat);
    });
    btn.addEventListener('mouseenter', function () {
      hoveredLegendCategory = cat;
      syncDonutHighlightUI();
    });
    btn.addEventListener('mouseleave', function () {
      if (hoveredLegendCategory === cat) {
        hoveredLegendCategory = null;
        syncDonutHighlightUI();
      }
    });
    btn.addEventListener('focus', function () {
      hoveredLegendCategory = cat;
      syncDonutHighlightUI();
    });
    btn.addEventListener('blur', function () {
      if (hoveredLegendCategory === cat) {
        hoveredLegendCategory = null;
        syncDonutHighlightUI();
      }
    });
  });

  if (donutSegmentsGroup) {
    donutSegmentsGroup.addEventListener('click', function (event) {
      const seg = event.target.closest('[data-donut-category]');
      if (!seg) return;
      toggleLegendCategory(seg.getAttribute('data-donut-category'));
    });
    donutSegmentsGroup.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const seg = event.target.closest('[data-donut-category]');
      if (!seg) return;
      event.preventDefault();
      toggleLegendCategory(seg.getAttribute('data-donut-category'));
    });
    donutSegmentsGroup.addEventListener('mouseover', function (event) {
      const seg = event.target.closest('[data-donut-category]');
      if (!seg) return;
      const cat = seg.getAttribute('data-donut-category');
      if (cat && hoveredLegendCategory !== cat) {
        hoveredLegendCategory = cat;
        syncDonutHighlightUI();
      }
    });
    donutSegmentsGroup.addEventListener('mouseleave', function () {
      if (hoveredLegendCategory) {
        hoveredLegendCategory = null;
        syncDonutHighlightUI();
      }
    });
  }

  if (allocDonutCenter) {
    allocDonutCenter.addEventListener('click', function () {
      activeLegendCategory = null;
      hoveredLegendCategory = null;
      syncDonutHighlightUI();
    });
  }

  categoryCards.forEach(function (card) {
    card.addEventListener('click', function () {
      const cat = card.getAttribute('data-invest-category');
      if (cat) {
        openCategoryScreen(cat);
      }
    });
  });

  if (categoryPortfolioCard) {
    categoryPortfolioCard.addEventListener('click', function () {
      openOwnedScreen();
    });
  }

  if (ownedEmptyCtaBtn) {
    ownedEmptyCtaBtn.addEventListener('click', function () {
      closeOwnedScreen();
    });
  }

  // Klik tile aset pada daftar kategori maupun portofolio dimiliki -> buka layar detail
  [shelfTrackSaham, shelfTrackKripto, shelfTrackForex, ownedListTrack].forEach(function (track) {
    if (!track) return;
    track.addEventListener('click', function (event) {
      const card = event.target.closest('[data-asset-id]');
      if (!card) return;
      const assetId = card.getAttribute('data-asset-id');
      if (assetId) {
        openAssetDetail(assetId);
      }
    });
  });

  if (detailStatsToggle) {
    detailStatsToggle.addEventListener('click', function () {
      detailStatsExpanded = !detailStatsExpanded;
      renderAssetDetailScreen();
    });
  }

  detailTimeframeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tf = btn.getAttribute('data-timeframe');
      if (tf && tf !== detailTimeframe) {
        detailTimeframe = tf;
        detailHoverCoord = null;
        if (detailChartTooltip) detailChartTooltip.hidden = true;
        renderAssetDetailScreen();
      }
    });
  });

  detailChartModeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const mode = btn.getAttribute('data-chart-mode');
      if (mode && mode !== detailChartMode) {
        detailChartMode = mode;
        detailHoverCoord = null;
        if (detailChartTooltip) detailChartTooltip.hidden = true;
        renderAssetDetailScreen();
      }
    });
  });

  detailSubtabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const tabKey = tab.getAttribute('data-detail-tab');
      if (tabKey && tabKey !== detailActiveSubTab) {
        detailActiveSubTab = tabKey;
        renderAssetDetailScreen();
      }
    });
  });

  if (assetPriceCanvas) {
    const handleScrub = function (clientX) {
      if (!state.selectedAssetId) return;
      const asset = getAssetById(state.selectedAssetId);
      if (!asset) return;
      const hit = getDetailChartScrubPoint(clientX);
      if (!hit) return;
      detailHoverCoord = hit.coord;
      if (detailChartTooltip && hit.point) {
        detailChartTooltip.textContent =
          formatUsdFull(hit.point.price) + ' \u00B7 ' + formatTimeHHMM(hit.point.ts);
        detailChartTooltip.hidden = false;
      }
      renderAssetPriceChart(asset);
    };
    const clearScrub = function () {
      if (!detailHoverCoord) return;
      detailHoverCoord = null;
      if (detailChartTooltip) detailChartTooltip.hidden = true;
      if (state.selectedAssetId) {
        const asset = getAssetById(state.selectedAssetId);
        if (asset) renderAssetPriceChart(asset);
      }
    };
    assetPriceCanvas.addEventListener('pointerdown', function (e) {
      handleScrub(e.clientX);
    });
    assetPriceCanvas.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || e.buttons > 0) {
        handleScrub(e.clientX);
      }
    });
    assetPriceCanvas.addEventListener('pointerleave', clearScrub);
    assetPriceCanvas.addEventListener('pointerup', clearScrub);
    assetPriceCanvas.addEventListener('pointercancel', clearScrub);
  }

  if (detailBuyBtn) {
    detailBuyBtn.addEventListener('click', function () {
      if (!detailBuyBtn.disabled && state.selectedAssetId) {
        buyAsset(state.selectedAssetId);
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (
      event.key === 'Escape' &&
      (!roadmapModal || roadmapModal.hidden) &&
      (!resetModal || resetModal.hidden) &&
      (!offlineModal || offlineModal.hidden)
    ) {
      if (assetDetailScreen && !assetDetailScreen.hidden) {
        closeAssetDetail();
      } else if (investingOwnedScreen && !investingOwnedScreen.hidden) {
        closeOwnedScreen();
      } else if (investingCategoryScreen && !investingCategoryScreen.hidden) {
        closeCategoryScreen();
      }
    }
  });

  if (root.addEventListener) {
    root.addEventListener('resize', function () {
      if (assetDetailScreen && !assetDetailScreen.hidden && state.selectedAssetId) {
        const currentAsset = getAssetById(state.selectedAssetId);
        if (currentAsset) {
          renderAssetPriceChart(currentAsset);
        }
      }
    });
  }
}
