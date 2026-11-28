/* ==========================================================================
   BUSINESS TYCOON TAP - MODUL LOGIKA KRIPTO & FOREX
   Memisahkan valuasi pasar 24/7 (tanpa dividen/imbal hasil pasif) dari Saham
   serta menghitung pembaruan nilai portofolio real-time.
   ========================================================================== */

import { CONFIG } from '../../core/config.js';

export const NON_DIVIDEND_CATEGORIES = Object.freeze(['Kripto', 'Forex']);

/**
 * Menentukan apakah kategori aset termasuk pasar berkelanjutan tanpa dividen (Kripto / Forex).
 */
export function isCryptoOrForexCategory(category) {
  return category === 'Kripto' || category === 'Forex';
}

/**
 * Menentukan apakah sebuah aset tidak membagikan dividen/imbal hasil pasif per jam.
 */
export function isNonDividendAsset(asset) {
  if (!asset || typeof asset !== 'object') return true;
  return isCryptoOrForexCategory(asset.category);
}

/**
 * Menghitung imbal hasil pasif per jam suatu posisi.
 * Aset Kripto dan Forex selalu mengembalikan 0 karena hanya menghasilkan capital gain.
 */
export function calculateAssetHourlyYield(asset, units, marketPrice) {
  if (!asset || isNonDividendAsset(asset)) {
    return 0;
  }
  const safeRate = Number(asset.yieldRate);
  const safeUnits = Number(units);
  const safePrice = Number(marketPrice);
  if (
    !Number.isFinite(safeRate) ||
    safeRate <= 0 ||
    !Number.isFinite(safeUnits) ||
    safeUnits <= 0 ||
    !Number.isFinite(safePrice) ||
    safePrice <= 0
  ) {
    return 0;
  }
  const hourly = safeUnits * safePrice * safeRate;
  return Number.isFinite(hourly) && hourly > 0 ? hourly : 0;
}

/**
 * Menghitung total estimasi imbal hasil pasif per jam seluruh portofolio (Kripto & Forex = 0).
 */
export function calculateTotalInvestmentYield(assets, holdings, getPriceFn) {
  if (!Array.isArray(assets) || !holdings || typeof getPriceFn !== 'function') {
    return 0;
  }
  let total = 0;
  assets.forEach(function (asset) {
    if (isNonDividendAsset(asset)) return;
    const holding = holdings[asset.id];
    const units = holding && Number.isFinite(Number(holding.units)) ? Number(holding.units) : 0;
    if (units <= 0) return;
    const hourly = calculateAssetHourlyYield(asset, units, getPriceFn(asset.id));
    if (Number.isFinite(hourly) && hourly > 0) {
      total += hourly;
    }
  });
  return Number.isFinite(total) ? total : 0;
}

/**
 * Menghitung valuasi real-time, P&L, posisi terbuka, dan imbal hasil untuk satu kategori aset.
 */
export function calculateCategoryValuation(category, assets, holdings, getPriceFn) {
  let totalValue = 0;
  let totalCost = 0;
  let hourlyYield = 0;
  let openPositions = 0;
  const hasDividends = !isCryptoOrForexCategory(category);

  if (Array.isArray(assets) && holdings && typeof getPriceFn === 'function') {
    assets.forEach(function (asset) {
      if (!asset || asset.category !== category) return;
      const holding = holdings[asset.id];
      const units = holding && Number.isFinite(Number(holding.units)) ? Number(holding.units) : 0;
      const avgEntry =
        holding && Number.isFinite(Number(holding.avgEntry)) ? Number(holding.avgEntry) : 0;
      if (units <= 0) return;

      openPositions += 1;
      const marketPrice = Number(getPriceFn(asset.id));
      const safePrice = Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : 0;
      const positionValue = units * safePrice;
      const positionCost = units * avgEntry;

      if (Number.isFinite(positionValue)) {
        totalValue += positionValue;
      }
      if (Number.isFinite(positionCost)) {
        totalCost += positionCost;
      }
      if (hasDividends) {
        hourlyYield += calculateAssetHourlyYield(asset, units, safePrice);
      }
    });
  }

  const pnlValue = totalCost > 0 ? totalValue - totalCost : 0;
  const rawPct = totalCost > 0 ? (pnlValue / totalCost) * 100 : 0;
  const pnlPct = Number.isFinite(rawPct) ? rawPct : 0;

  return {
    totalValue: Number.isFinite(totalValue) ? totalValue : 0,
    totalCost: Number.isFinite(totalCost) ? totalCost : 0,
    pnlValue: Number.isFinite(pnlValue) ? pnlValue : 0,
    pnlPct: pnlPct,
    hourlyYield: hasDividends && Number.isFinite(hourlyYield) ? hourlyYield : 0,
    openPositions: openPositions,
    hasDividends: hasDividends
  };
}

/**
 * Menghitung snapshot portofolio lintas kategori secara real-time untuk dasbor investasi.
 */
export function calculateLivePortfolioSnapshot(categories, assets, holdings, getPriceFn) {
  const byCategory = {};
  let total = 0;
  let pnlValue = 0;
  let totalCost = 0;
  let totalHourlyYield = 0;
  let openPositions = 0;

  const safeCategories = Array.isArray(categories) ? categories : [];
  safeCategories.forEach(function (cat) {
    const summary = calculateCategoryValuation(cat, assets, holdings, getPriceFn);
    byCategory[cat] = summary;
    total += summary.totalValue;
    pnlValue += summary.pnlValue;
    totalCost += summary.totalCost;
    totalHourlyYield += summary.hourlyYield;
    openPositions += summary.openPositions;
  });

  let classes = 0;
  let top = null;
  let topValue = 0;
  safeCategories.forEach(function (cat) {
    const value = byCategory[cat].totalValue;
    if (value > 0) {
      classes += 1;
      if (value > topValue) {
        top = cat;
        topValue = value;
      }
    }
  });

  const topShare = total > 0 && top ? (topValue / total) * 100 : 0;
  const rawPnlPct = totalCost > 0 ? (pnlValue / totalCost) * 100 : 0;

  return {
    byCategory: byCategory,
    total: Number.isFinite(total) ? total : 0,
    totalCost: Number.isFinite(totalCost) ? totalCost : 0,
    pnlValue: Number.isFinite(pnlValue) ? pnlValue : 0,
    pnlPct: Number.isFinite(rawPnlPct) ? rawPnlPct : 0,
    totalHourlyYield: Number.isFinite(totalHourlyYield) ? totalHourlyYield : 0,
    classes: classes,
    top: top,
    topShare: Number.isFinite(topShare) ? topShare : 0,
    openPositions: openPositions
  };
}

/**
 * Membentuk profil tampilan layar detail aset (membedakan Saham vs Kripto & Forex).
 */
export function buildContinuousMarketProfile(asset) {
  const category = asset && asset.category ? asset.category : 'Saham';
  const isCrypto = category === 'Kripto';
  const isForex = category === 'Forex';
  const isContinuousMarket = isCrypto || isForex;

  let displaySymbol = asset ? asset.symbol || asset.name : '';
  let displaySubtitle = asset ? asset.name : '';
  let extraStatLabel = 'Harga Dasar';

  if (isCrypto) {
    displaySymbol = (asset.symbol || asset.name) + ' / USD';
    displaySubtitle = asset.name;
    extraStatLabel = 'Harga Dasar';
  } else if (isForex) {
    displaySymbol = asset.name ? asset.name.replace('/', ' / ') : asset.symbol || '';
    displaySubtitle = 'Pasangan Mata Uang';
    extraStatLabel = 'Rentang 24j';
  }

  return {
    isCrypto: isCrypto,
    isForex: isForex,
    isContinuousMarket: isContinuousMarket,
    hasDividends: !isContinuousMarket,
    showSessionTag: !isContinuousMarket,
    showMetaStrip: !isContinuousMarket,
    defaultStatsExpanded: isContinuousMarket,
    displaySymbol: displaySymbol,
    displaySubtitle: displaySubtitle,
    extraStatLabel: extraStatLabel,
    initialPriceLabel: isContinuousMarket ? 'Harga acuan awal' : 'Harga pembukaan dasar'
  };
}

/**
 * Menghitung metrik statistik pasar 24 jam khusus aset Kripto dan Forex.
 */
export function computeContinuousMarketMetrics(asset, stats) {
  const safeStats = stats || {};
  const sessionHigh = Number.isFinite(Number(safeStats.sessionHigh)) ? Number(safeStats.sessionHigh) : 0;
  const sessionLow = Number.isFinite(Number(safeStats.sessionLow)) ? Number(safeStats.sessionLow) : 0;
  const initialPrice = asset && Number.isFinite(Number(asset.initialPrice)) ? Number(asset.initialPrice) : 0;
  const vol = asset && Number.isFinite(Number(asset.volatility)) ? Number(asset.volatility) : 0;
  const isForex = Boolean(asset && asset.category === 'Forex');
  const range24h = Math.max(0, sessionHigh - sessionLow);

  return {
    high24h: sessionHigh,
    low24h: sessionLow,
    volatilityPct: vol * 100,
    volatilityLabel: (vol * 100).toFixed(CONFIG.CURRENCY_DECIMALS).replace('.', ',') + '%',
    extraStatLabel: isForex ? 'Rentang 24j' : 'Harga Dasar',
    extraStatValue: isForex ? range24h : initialPrice
  };
}
