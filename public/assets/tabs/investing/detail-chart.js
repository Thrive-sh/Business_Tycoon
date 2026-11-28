/* ==========================================================================
   BUSINESS TYCOON TAP - GRAFIK DETAIL ASET INVESTASI (Canvas 2D & Matematika Kurva)
   Kurva Catmull-Rom halus + sumbu Y kanan + garis referensi harga + mode lilin
   ========================================================================== */

import { CONFIG } from '../../core/config.js';
import { root } from '../../utils/dom.js';
import {
  formatUsdCompact,
  formatUsdFull,
  formatTimeHHMM,
  formatTimeHHMMSS
} from '../../utils/format.js';

/**
 * Memotong titik riwayat harga sesuai rentang waktu aktif ('30d', '1m', '2m', '3m', 'all').
 */
export function sliceTimeframePoints(points, timeframe) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }
  const counts = CONFIG.CHART_TIMEFRAME_COUNTS;
  const maxPoints = counts[timeframe] || counts[CONFIG.CHART_DEFAULT_TIMEFRAME] || points.length;
  if (points.length <= maxPoints) {
    return points.slice();
  }
  return points.slice(points.length - maxPoints);
}

/**
 * Menghaluskan deret harga interior secara lembut tanpa mengubah titik awal dan titik harga terkini.
 */
export function smoothPriceSeries(prices, passes) {
  if (!Array.isArray(prices) || prices.length <= CONFIG.CHART_MIN_POINTS) {
    return Array.isArray(prices) ? prices.slice() : [];
  }
  const numPasses =
    typeof passes === 'number' && passes >= 0 ? Math.floor(passes) : CONFIG.CHART_SMOOTH_PASSES;
  let current = prices.slice();
  const neighborW = CONFIG.CHART_SMOOTH_NEIGHBOR_WEIGHT;
  const centerW = CONFIG.CHART_SMOOTH_CENTER_WEIGHT;

  for (let p = 0; p < numPasses; p += 1) {
    const next = current.slice();
    for (let i = 1; i < current.length - 1; i += 1) {
      next[i] = current[i - 1] * neighborW + current[i] * centerW + current[i + 1] * neighborW;
    }
    current = next;
  }
  return current;
}

/**
 * Menghitung statistik ringkas sesi (Buka, Tertinggi, Terendah, dan perubahan rentang waktu).
 */
export function computeSessionStats(points, fullHistory, asset) {
  const safePoints = Array.isArray(points) && points.length > 0 ? points : [];
  const safeFull = Array.isArray(fullHistory) && fullHistory.length > 0 ? fullHistory : safePoints;
  const fallback = asset ? asset.initialPrice : 0;

  if (safePoints.length === 0) {
    return {
      open: fallback,
      high: fallback,
      low: fallback,
      close: fallback,
      sessionHigh: fallback,
      sessionLow: fallback,
      deltaValue: 0,
      deltaPct: 0
    };
  }

  const open = Number(safePoints[0].price);
  const close = Number(safePoints[safePoints.length - 1].price);
  let high = open;
  let low = open;
  safePoints.forEach(function (pt) {
    const v = Number(pt.price);
    if (v > high) high = v;
    if (v < low) low = v;
  });

  let sessionHigh = high;
  let sessionLow = low;
  if (safeFull.length > 0) {
    sessionHigh = Number(safeFull[0].price);
    sessionLow = Number(safeFull[0].price);
    safeFull.forEach(function (pt) {
      const v = Number(pt.price);
      if (v > sessionHigh) sessionHigh = v;
      if (v < sessionLow) sessionLow = v;
    });
  }

  const deltaValue = Number.isFinite(close - open) ? close - open : 0;
  const deltaPct = open > 0 ? (deltaValue / open) * 100 : 0;

  return {
    open: Number.isFinite(open) ? open : fallback,
    high: Number.isFinite(high) ? high : fallback,
    low: Number.isFinite(low) ? low : fallback,
    close: Number.isFinite(close) ? close : fallback,
    sessionHigh: Number.isFinite(sessionHigh) ? sessionHigh : fallback,
    sessionLow: Number.isFinite(sessionLow) ? sessionLow : fallback,
    deltaValue: deltaValue,
    deltaPct: Number.isFinite(deltaPct) ? deltaPct : 0
  };
}

/**
 * Mengelompokkan deret titik harga menjadi lilin OHLC untuk mode grafik candlestick.
 */
export function buildCandlestickBuckets(points, groupSize) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const step = Math.max(1, Math.floor(groupSize || CONFIG.CHART_CANDLE_GROUP_SIZE));
  const candles = [];

  for (let i = 0; i < points.length; i += step) {
    const slice = points.slice(i, i + step);
    const open = i > 0 ? Number(points[i - 1].price) : Number(slice[0].price);
    const close = Number(slice[slice.length - 1].price);
    let high = Math.max(open, close);
    let low = Math.min(open, close);
    slice.forEach(function (pt) {
      const p = Number(pt.price);
      if (p > high) high = p;
      if (p < low) low = p;
    });
    candles.push({
      ts: slice[slice.length - 1].ts,
      open: open,
      high: high,
      low: low,
      close: close
    });
  }
  return candles;
}

/**
 * Menghitung segmen Bezier kubik Catmull-Rom agar kurva grafik tampak halus tanpa sudut patah.
 */
export function buildCatmullRomSegments(coords, tension) {
  if (!Array.isArray(coords) || coords.length < CONFIG.CHART_MIN_POINTS) {
    return [];
  }
  const k = typeof tension === 'number' ? tension : CONFIG.CHART_SPLINE_TENSION;
  const div = CONFIG.CHART_SPLINE_DIVISOR;
  const segments = [];

  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i > 0 ? i - 1 : i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 1 < coords.length - 1 ? i + 1 + 1 : i + 1];

    const cp1x = p1.x + ((p2.x - p0.x) * k) / div;
    const cp1y = p1.y + ((p2.y - p0.y) * k) / div;
    const cp2x = p2.x - ((p3.x - p1.x) * k) / div;
    const cp2y = p2.y - ((p3.y - p1.y) * k) / div;

    segments.push({
      cp1x: cp1x,
      cp1y: cp1y,
      cp2x: cp2x,
      cp2y: cp2y,
      endX: p2.x,
      endY: p2.y
    });
  }
  return segments;
}

/**
 * Memformat label harga sumbu Y kanan agar tetap ringkas namun tidak duplikat pada rentang sempit.
 */
export function formatChartAxisPrice(value, span) {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.abs(safe) < CONFIG.CHART_SMALL_PRICE_THRESHOLD) {
    return formatUsdFull(safe);
  }
  const units = CONFIG.COMPACT_UNITS_US;
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    if (Math.abs(safe) >= unit.threshold) {
      const scaled = safe / unit.threshold;
      const stepRatio = Number.isFinite(span) && safe > 0 ? span / safe : 1;
      const decimals =
        stepRatio < 1 / CONFIG.COMPACT_THRESHOLD * CONFIG.CHART_Y_TICKS
          ? CONFIG.CHART_HIGH_PRECISION_DECIMALS
          : CONFIG.CURRENCY_DECIMALS;
      return '$' + scaled.toFixed(decimals).replace(/\.?0+$/, '') + unit.suffix;
    }
  }
  return formatUsdCompact(safe);
}

function computePriceBounds(priceValues) {
  let minPrice = priceValues[0];
  let maxPrice = priceValues[0];
  priceValues.forEach(function (val) {
    if (val < minPrice) minPrice = val;
    if (val > maxPrice) maxPrice = val;
  });

  const displayMin = minPrice;
  const displayMax = maxPrice;

  if (maxPrice <= minPrice) {
    const flatSpread = Math.max(minPrice * CONFIG.CHART_FLAT_SPREAD_RATIO, 1);
    minPrice = Math.max(0, minPrice - flatSpread);
    maxPrice = maxPrice + flatSpread;
  } else {
    const range = maxPrice - minPrice;
    minPrice = Math.max(0, minPrice - range * CONFIG.CHART_RANGE_PAD_RATIO);
    maxPrice = maxPrice + range * CONFIG.CHART_RANGE_PAD_RATIO;
  }

  return {
    displayMin: displayMin,
    displayMax: displayMax,
    scaleMin: minPrice,
    scaleMax: maxPrice
  };
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / CONFIG.CHART_MID_DIVISOR, h / CONFIG.CHART_MID_DIVISOR);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawChartFrame(ctx, cssWidth, cssHeight, dpr, frame) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const plotLeft = CONFIG.CHART_PAD_LEFT;
  const plotRight = cssWidth - CONFIG.CHART_PAD_RIGHT;
  const plotTop = CONFIG.CHART_PAD_TOP;
  const plotBottom = cssHeight - CONFIG.CHART_PAD_BOTTOM;
  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);

  // Garis kisi horizontal & vertikal tipis ala TradingView terang
  ctx.strokeStyle = CONFIG.CHART_GRID_COLOR;
  ctx.lineWidth = 1;

  const coords = frame.coords;
  const dotCoord = frame.dotCoord || coords[coords.length - 1];
  const clampedDotY = Math.max(plotTop, Math.min(plotBottom, dotCoord.y));
  const badgeH = CONFIG.CHART_PRICE_BADGE_HEIGHT;
  const badgeY = Math.max(
    plotTop - badgeH / CONFIG.CHART_MID_DIVISOR,
    Math.min(plotBottom - badgeH / CONFIG.CHART_MID_DIVISOR, clampedDotY - badgeH / CONFIG.CHART_MID_DIVISOR)
  );
  const badgeCenterY = badgeY + badgeH / CONFIG.CHART_MID_DIVISOR;

  const yTickCount = CONFIG.CHART_Y_TICKS;
  const scaleSpan = Math.max(CONFIG.CHART_MIN_SPAN, frame.scaleMax - frame.scaleMin);
  ctx.font = CONFIG.CHART_FONT;
  ctx.fillStyle = CONFIG.CHART_LABEL_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < yTickCount; i += 1) {
    const frac = i / (yTickCount - 1);
    const y = plotTop + frac * plotH;
    const tickPrice = frame.scaleMax - frac * scaleSpan;

    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    if (Math.abs(y - badgeCenterY) >= badgeH) {
      ctx.fillText(
        formatChartAxisPrice(tickPrice, scaleSpan),
        plotRight + CONFIG.CHART_AXIS_LABEL_GAP_X,
        y
      );
    }
  }

  // Garis kisi vertikal tipis
  const xTickCount = CONFIG.CHART_X_TICKS;
  for (let xIdx = 1; xIdx < xTickCount; xIdx += 1) {
    const gx = plotLeft + (xIdx / xTickCount) * plotW;
    ctx.beginPath();
    ctx.moveTo(gx, plotTop);
    ctx.lineTo(gx, plotBottom);
    ctx.stroke();
  }

  // Klip area plot agar penggambaran kurva dan lilin tetap bersih di dalam bingkai
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    plotLeft,
    plotTop - CONFIG.CHART_CLIP_PAD_PX,
    Math.max(1, plotRight - plotLeft),
    plotH + CONFIG.CHART_CLIP_PAD_PX + CONFIG.CHART_CLIP_PAD_PX
  );
  ctx.clip();

  if (frame.chartMode === 'candle' && Array.isArray(frame.candles) && frame.candles.length > 0) {
    const candles = frame.candles;
    const slotW = plotW / Math.max(1, candles.length);
    const bodyW = Math.max(CONFIG.CHART_CANDLE_MIN_BODY_PX, slotW * CONFIG.CHART_CANDLE_WIDTH_RATIO);
    candles.forEach(function (c, idx) {
      const cx = plotLeft + (idx + 1 / CONFIG.CHART_MID_DIVISOR) * slotW;
      const yHigh = plotBottom - ((c.high - frame.scaleMin) / scaleSpan) * plotH;
      const yLow = plotBottom - ((c.low - frame.scaleMin) / scaleSpan) * plotH;
      const yOpen = plotBottom - ((c.open - frame.scaleMin) / scaleSpan) * plotH;
      const yClose = plotBottom - ((c.close - frame.scaleMin) / scaleSpan) * plotH;
      const isUp = c.close >= c.open;
      const color = isUp ? CONFIG.CHART_CANDLE_UP_COLOR : CONFIG.CHART_CANDLE_DOWN_COLOR;

      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.CHART_CANDLE_WICK_WIDTH;
      ctx.beginPath();
      ctx.moveTo(cx, yHigh);
      ctx.lineTo(cx, yLow);
      ctx.stroke();

      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(CONFIG.CHART_CANDLE_MIN_BODY_PX, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      ctx.fillRect(cx - bodyW / CONFIG.CHART_MID_DIVISOR, bodyTop, bodyW, bodyHeight);
    });
  } else {
    const segments = buildCatmullRomSegments(coords, CONFIG.CHART_SPLINE_TENSION);
    const traceSpline = function () {
      ctx.moveTo(coords[0].x, coords[0].y);
      segments.forEach(function (seg) {
        ctx.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.endX, seg.endY);
      });
    };

    const lastCoord = coords[coords.length - 1];
    ctx.save();
    ctx.beginPath();
    traceSpline();
    ctx.lineTo(lastCoord.x, plotBottom);
    ctx.lineTo(coords[0].x, plotBottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
    grad.addColorStop(0, CONFIG.CHART_FILL_TOP);
    grad.addColorStop(1, CONFIG.CHART_FILL_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    traceSpline();
    ctx.strokeStyle = CONFIG.CHART_STROKE_COLOR;
    ctx.lineWidth = CONFIG.CHART_LINE_WIDTH;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();

  // Garis referensi titik harga terkini putus-putus biru horizontal
  ctx.save();
  ctx.setLineDash([CONFIG.CHART_REF_LINE_DASH_ON, CONFIG.CHART_REF_LINE_DASH_OFF]);
  ctx.strokeStyle = CONFIG.CHART_STROKE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, clampedDotY);
  ctx.lineTo(plotRight, clampedDotY);
  ctx.stroke();
  ctx.restore();

  // Lencana harga terkini biru solid di sumbu Y kanan
  const badgeX = plotRight + CONFIG.CHART_AXIS_LABEL_GAP_X - CONFIG.CHART_PRICE_BADGE_PAD_X;
  const badgeW = cssWidth - badgeX - CONFIG.CHART_PAD_LEFT / CONFIG.CHART_MID_DIVISOR;
  ctx.fillStyle = CONFIG.CHART_PRICE_BADGE_BG;
  drawRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, CONFIG.CHART_PRICE_BADGE_RADIUS);
  ctx.fill();

  ctx.font = CONFIG.CHART_BADGE_FONT;
  ctx.fillStyle = CONFIG.CHART_PRICE_BADGE_TEXT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    formatChartAxisPrice(frame.latestPrice, scaleSpan),
    plotRight + CONFIG.CHART_AXIS_LABEL_GAP_X,
    badgeCenterY
  );

  // Titik & halo biru statis di ujung kanan kurva (mode garis)
  if (frame.chartMode !== 'candle') {
    ctx.beginPath();
    ctx.arc(dotCoord.x, dotCoord.y, CONFIG.CHART_DOT_OUTER_RADIUS, 0, Math.PI * CONFIG.FULL_CIRCLE_TURNS);
    ctx.fillStyle = 'rgba(' + CONFIG.CHART_PULSE_COLOR_FLAT + ', ' + CONFIG.CHART_HALO_ALPHA + ')';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dotCoord.x, dotCoord.y, CONFIG.CHART_DOT_INNER_RADIUS, 0, Math.PI * CONFIG.FULL_CIRCLE_TURNS);
    ctx.fillStyle = CONFIG.CHART_STROKE_COLOR;
    ctx.fill();
  }

  // Garis bidik interaktif saat disentuh/diarahkan
  if (frame.hoverCoord) {
    ctx.save();
    ctx.setLineDash([CONFIG.CHART_REF_LINE_DASH_ON, CONFIG.CHART_REF_LINE_DASH_OFF]);
    ctx.strokeStyle = CONFIG.CHART_CROSSHAIR_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(frame.hoverCoord.x, plotTop);
    ctx.lineTo(frame.hoverCoord.x, plotBottom);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(
      frame.hoverCoord.x,
      frame.hoverCoord.y,
      CONFIG.CHART_DOT_INNER_RADIUS,
      0,
      Math.PI * CONFIG.FULL_CIRCLE_TURNS
    );
    ctx.fillStyle = CONFIG.CHART_DOT_BG_COLOR;
    ctx.fill();
    ctx.lineWidth = CONFIG.CHART_LINE_WIDTH;
    ctx.strokeStyle = CONFIG.CHART_STROKE_COLOR;
    ctx.stroke();
  }

  // Label waktu sumbu X di bawah (gunakan HH:MM:SS jika HH:MM berulang pada rentang singkat)
  const rawFirstX = formatTimeHHMM(frame.firstTs);
  const rawMidX = formatTimeHHMM(frame.midTs);
  const rawLastX = formatTimeHHMM(frame.lastTs);
  const hasDuplicateShortX =
    rawFirstX === rawMidX || rawMidX === rawLastX || rawFirstX === rawLastX;
  const firstLabelX = hasDuplicateShortX ? formatTimeHHMMSS(frame.firstTs) : rawFirstX;
  const midLabelX = hasDuplicateShortX ? formatTimeHHMMSS(frame.midTs) : rawMidX;
  const lastLabelX = hasDuplicateShortX ? formatTimeHHMMSS(frame.lastTs) : rawLastX;

  ctx.font = CONFIG.CHART_FONT;
  ctx.fillStyle = CONFIG.CHART_LABEL_COLOR;
  ctx.textBaseline = 'alphabetic';
  const xLabelY = plotBottom + CONFIG.CHART_X_LABEL_OFFSET_Y;
  ctx.textAlign = 'left';
  ctx.fillText(firstLabelX, plotLeft, xLabelY);
  ctx.textAlign = 'center';
  ctx.fillText(midLabelX, plotLeft + plotW / CONFIG.CHART_MID_DIVISOR, xLabelY);
  ctx.textAlign = 'right';
  ctx.fillText(lastLabelX, plotRight, xLabelY);
}

const chartPlotState = {
  latestPlotMeta: null
};

export function cancelDetailChartAnimation() {
  // Tidak ada animasi grafik aktif (grafik dirender statis secara instan)
}

export function resetDetailChartState() {
  chartPlotState.latestPlotMeta = null;
}

export function getDetailChartScrubPoint(clientX) {
  const meta = chartPlotState.latestPlotMeta;
  if (!meta || !Array.isArray(meta.coords) || meta.coords.length === 0) return null;
  const relX = clientX - meta.rectLeft;
  const clampedX = Math.max(meta.plotLeft, Math.min(meta.plotRight, relX));
  const ratio = (clampedX - meta.plotLeft) / Math.max(1, meta.plotRight - meta.plotLeft);
  const idx = Math.max(0, Math.min(meta.coords.length - 1, Math.round(ratio * (meta.coords.length - 1))));
  return {
    coord: meta.coords[idx],
    point: meta.points[idx]
  };
}

export function renderDetailPriceChart(canvas, asset, rawPoints, options) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const opts = options || {};
  const timeframe = opts.timeframe || CONFIG.CHART_DEFAULT_TIMEFRAME;
  const chartMode = opts.chartMode || 'line';
  const hoverCoord = opts.hoverCoord || null;

  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect && rect.width > 0 ? rect.width : CONFIG.CHART_FALLBACK_WIDTH_PX;
  const cssHeight =
    rect && rect.height > 0 ? rect.height : CONFIG.CHART_CSS_HEIGHT_PX;
  const dpr =
    Number.isFinite(root.devicePixelRatio) && root.devicePixelRatio > 0
      ? root.devicePixelRatio
      : 1;

  const targetW = Math.round(cssWidth * dpr);
  const targetH = Math.round(cssHeight * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const fallbackNow = Date.now();
  const fallbackPrice = asset ? asset.initialPrice : 0;
  let points = sliceTimeframePoints(rawPoints, timeframe).filter(function (pt) {
    return pt && Number.isFinite(pt.price) && pt.price > 0;
  });
  if (points.length === 0) {
    points = [
      { ts: fallbackNow - CONFIG.PRICE_TICK_MS, price: fallbackPrice },
      { ts: fallbackNow, price: fallbackPrice }
    ];
  } else if (points.length === 1) {
    points.unshift({ ts: points[0].ts - CONFIG.PRICE_TICK_MS, price: points[0].price });
  }

  const rawPrices = points.map(function (pt) {
    return pt.price;
  });
  const smoothedPrices = smoothPriceSeries(rawPrices, CONFIG.CHART_SMOOTH_PASSES);
  const candles =
    chartMode === 'candle'
      ? buildCandlestickBuckets(points, CONFIG.CHART_CANDLE_GROUP_SIZE)
      : null;

  const boundInputs =
    chartMode === 'candle' && candles && candles.length > 0
      ? candles.reduce(function (acc, c) {
          acc.push(c.low, c.high);
          return acc;
        }, [])
      : smoothedPrices;
  const targetBounds = computePriceBounds(boundInputs);

  const plotLeft = CONFIG.CHART_PAD_LEFT;
  const plotRight = cssWidth - CONFIG.CHART_PAD_RIGHT;
  const plotTop = CONFIG.CHART_PAD_TOP;
  const plotBottom = cssHeight - CONFIG.CHART_PAD_BOTTOM;
  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);

  const firstTs = points[0].ts;
  const midTs = points[Math.floor(points.length / CONFIG.CHART_MID_DIVISOR)].ts;
  const lastTs = points[points.length - 1].ts;
  const latestPrice = rawPrices[rawPrices.length - 1];

  const safeSpan =
    targetBounds.scaleMax - targetBounds.scaleMin > 0
      ? targetBounds.scaleMax - targetBounds.scaleMin
      : 1;
  const steadyCoords = smoothedPrices.map(function (val, idx) {
    const x = plotLeft + (idx / (smoothedPrices.length - 1)) * plotW;
    const y = plotBottom - ((val - targetBounds.scaleMin) / safeSpan) * plotH;
    return { x: x, y: y };
  });

  chartPlotState.latestPlotMeta = {
    rectLeft: rect ? rect.left : 0,
    plotLeft: plotLeft,
    plotRight: plotRight,
    coords: steadyCoords,
    points: points
  };

  drawChartFrame(ctx, cssWidth, cssHeight, dpr, {
    chartMode: chartMode,
    candles: candles,
    coords: steadyCoords,
    dotCoord: steadyCoords[steadyCoords.length - 1],
    scaleMin: targetBounds.scaleMin,
    scaleMax: targetBounds.scaleMax,
    latestPrice: latestPrice,
    firstTs: firstTs,
    midTs: midTs,
    lastTs: lastTs,
    hoverCoord: hoverCoord
  });
}
