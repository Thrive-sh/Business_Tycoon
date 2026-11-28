import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock localStorage in-memory yang mencatat jumlah pemanggilan setItem
function createMockStorage() {
  const store = new Map();
  let setCount = 0;
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      setCount += 1;
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
      setCount = 0;
    },
    getWriteCount() {
      return setCount;
    },
    resetWriteCount() {
      setCount = 0;
    }
  };
}

const mockStorage = createMockStorage();
globalThis.localStorage = mockStorage;

// Impor dinamis SETELAH mock localStorage terpasang (impor statis dievaluasi lebih dulu)
const [configMod, assetsMod, formatMod, firebaseMod, stateMod, earningsMod, cryptoForexMod, detailChartMod, investingMod, profileMod, mainMod] =
  await Promise.all([
    import('../public/assets/core/config.js'),
    import('../public/assets/data/assets.js'),
    import('../public/assets/utils/format.js'),
    import('../public/assets/core/firebase.js'),
    import('../public/assets/core/state.js'),
    import('../public/assets/tabs/earnings/earnings.js'),
    import('../public/assets/tabs/investing/crypto-forex.js'),
    import('../public/assets/tabs/investing/detail-chart.js'),
    import('../public/assets/tabs/investing/investing.js'),
    import('../public/assets/tabs/profile/profile.js'),
    import('../public/assets/core/main.js')
  ]);
const game = Object.assign(
  {},
  configMod,
  assetsMod,
  formatMod,
  firebaseMod,
  stateMod,
  earningsMod,
  cryptoForexMod,
  detailChartMod,
  investingMod,
  profileMod,
  mainMod
);

test('formatCurrencyValue, formatRupiah*, dan formatSignedPercent anti-NaN/Infinity', function () {
  assert.equal(game.formatCurrencyValue(0), '0,00');
  assert.equal(game.formatCurrencyValue(1), '1,00');
  assert.equal(game.formatCurrencyValue(999.99), '999,99');
  assert.equal(game.formatCurrencyValue(1500), '1,5 rb');
  assert.equal(game.formatCurrencyValue(2500000), '2,5 jt');
  assert.equal(game.formatCurrencyValue(3250000000), '3,25 M');
  assert.equal(game.formatCurrencyValue(1500000000000), '1,5 T');
  assert.equal(game.formatFullCurrencyValue(2500000), '2.500.000,00');

  assert.equal(game.formatRupiahFull(1234567.89), 'Rp1.234.567,89');
  assert.equal(game.formatRupiahCompact(25000), 'Rp25 rb');
  assert.equal(game.formatRupiahCompact(3600000), 'Rp3,6 jt');
  assert.equal(game.formatRupiahCompact(1600000000), 'Rp1,6 M');
  assert.equal(game.formatRupiahCompact(NaN), 'Rp0,00');
  assert.equal(game.formatRupiahFull(Infinity), 'Rp0,00');

  assert.equal(game.formatSignedPercent(1.25), '+1,25%');
  assert.equal(game.formatSignedPercent(-0.4), '-0,40%');
  assert.equal(game.formatSignedPercent(0), '+0,00%');
  assert.equal(game.formatSignedPercent(NaN), '+0,00%');
  assert.equal(game.formatSignedPercent(Infinity), '+0,00%');
});

test('Executive Black-Gold Precious Card: struktur SVG, branding fiktif, dan bebas merek nyata', function () {
  const rootDir = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(rootDir, 'public/index.html'), 'utf8');
  const baseCss = fs.readFileSync(path.join(rootDir, 'public/assets/styles/base.css'), 'utf8');
  const earningsCss = fs.readFileSync(path.join(rootDir, 'public/assets/tabs/earnings/earnings.css'), 'utf8');
  const css = baseCss + '\n' + earningsCss;

  assert.equal(/\b(Danamon|JCB)\b/i.test(html), false, 'index.html harus bebas merek nyata');
  assert.ok(html.includes('content="#1B202C"'), 'meta theme-color harus #1B202C');
  assert.ok(html.includes('id="bank-card"'), 'Elemen #bank-card wajib ada');
  assert.ok(html.includes('TYCOON'), 'Institusi fiktif TYCOON wajib ada');
  assert.ok(html.includes('PRECIOUS'), 'Tier PRECIOUS wajib ada');
  assert.ok(html.includes('TYCOON EXECUTIVE'), 'Pemegang kartu TYCOON EXECUTIVE wajib ada');
  assert.ok(html.includes('05/29'), 'Valid thru 05/29 wajib ada');
  assert.ok(html.includes('id="balance-display"') && html.includes('aria-live="polite"'));
  assert.ok(html.includes('id="per-click-display"'));
  assert.ok(html.includes('id="preview-balance-display"'));

  assert.ok(css.includes('--header-grad-start: #242A38'));
  assert.ok(css.includes('--accent-gold: #F59E0B'));
  assert.ok(css.includes('.bank-card.is-glinting::before'));
  assert.ok(css.includes('.bank-card__balance--compact'));
  assert.ok(css.includes('.bank-card__balance--ultra-compact'));
});

test('INV-02 & INV-03: 138 aset investasi valid, 60 titik riwayat awal, dan tick harga finite', function () {
  mockStorage.clear();
  game.resetAllData();

  assert.equal(game.ASSETS.length, 138);
  const byCategory = { Saham: 0, Properti: 0, Kripto: 0, Forex: 0 };
  game.ASSETS.forEach(function (asset) {
    byCategory[asset.category] += 1;
    const history = game.state.priceHistory[asset.id];
    assert.ok(Array.isArray(history), 'Riwayat harga harus berupa array');
    assert.equal(history.length, 60, 'Riwayat awal harus 60 titik');
    history.forEach(function (pt) {
      assert.ok(Number.isFinite(pt.price) && pt.price >= asset.initialPrice * 0.01);
    });
  });

  assert.deepEqual(byCategory, { Saham: 56, Properti: 4, Kripto: 52, Forex: 26 });

  // Jalankan beberapa tick harga 3 detik dan pastikan semua tetap finite dan dibatasi 60 titik
  for (let i = 0; i < 5; i += 1) {
    game.runPriceTick();
  }
  game.ASSETS.forEach(function (asset) {
    const p = game.state.lastPrices[asset.id];
    assert.ok(Number.isFinite(p) && p >= asset.initialPrice * 0.01);
    assert.equal(game.state.priceHistory[asset.id].length, 60);
  });
});

test('INV-03 & INV-05: buyAsset/sellAsset atomik, weighted avgEntry, hapus saat 0, dan dividen pasif', function () {
  mockStorage.clear();
  game.resetAllData();

  // Set harga deterministik untuk pengujian Apple
  game.state.lastPrices.saham_apple = 100000;
  game.state.balance = 1000000;

  // Gagal beli 20 lembar karena butuh Rp2.000.000 (atomik: saldo & holdings tidak berubah)
  assert.equal(game.buyAsset('saham_apple', 20), false);
  assert.equal(game.state.balance, 1000000);
  assert.equal(game.state.holdings.saham_apple, undefined);

  // Beli 2 lembar @ Rp100.000 = Rp200.000
  assert.equal(game.buyAsset('saham_apple', 2), true);
  assert.equal(game.state.balance, 800000);
  assert.deepEqual(game.state.holdings.saham_apple, { units: 2, avgEntry: 100000 });

  // Harga naik ke Rp150.000, beli 1 lembar lagi -> avgEntry = (2*100000 + 1*150000)/3 = 116666,67
  game.state.lastPrices.saham_apple = 150000;
  assert.equal(game.buyAsset('saham_apple', 1), true);
  assert.equal(game.state.balance, 650000);
  assert.equal(game.state.holdings.saham_apple.units, 3);
  assert.equal(game.state.holdings.saham_apple.avgEntry, 116666.67);

  // Ringkasan kategori Saham: nilai 3 * 150000 = 450000, yieldPerHour = 450000 * 0.004 = Rp1.800/jam (Rp0,50/dtk)
  const summary = game.getCategorySummary('Saham');
  assert.equal(summary.totalValue, 450000);
  assert.equal(summary.hourlyYield, 1800);
  assert.ok(Number.isFinite(summary.pnlPct) && summary.pnlValue > 0);

  // Tick pasif 1 detik menyalurkan dividen Rp1.800 / 3600 = Rp0,50 ke saldo pemain
  const balBeforePassive = game.state.balance;
  game.runPassiveTick();
  assert.equal(game.state.balance, Math.round((balBeforePassive + 0.5) * 100) / 100);

  // Gagal jual lebih banyak dari yang dimiliki
  assert.equal(game.sellAsset('saham_apple', 5), false);
  assert.equal(game.state.holdings.saham_apple.units, 3);

  // Jual sebagian (1 lembar): avgEntry tetap sama
  assert.equal(game.sellAsset('saham_apple', 1), true);
  assert.equal(game.state.holdings.saham_apple.units, 2);
  assert.equal(game.state.holdings.saham_apple.avgEntry, 116666.67);

  // Jual sisa 2 lembar -> entry dihapus bersih dari holdings
  assert.equal(game.sellAsset('saham_apple', 2), true);
  assert.equal(game.state.holdings.saham_apple, undefined);
});

test('INV-06: loadState migrasi v1 ke v2 dan persistensi holdings + lastPrices tanpa array riwayat', function () {
  mockStorage.clear();
  mockStorage.setItem(
    game.CONFIG.STORAGE_KEY,
    JSON.stringify({ balance: 142.5, perClick: 6 })
  );

  game.loadState();

  assert.equal(game.state.version, 2);
  assert.equal(game.state.balance, 142.5);
  assert.deepEqual(game.state.holdings, {});

  // Simpan kepemilikan dan harga baru pada schema v2
  game.state.balance = 500000;
  game.state.lastPrices.kripto_solana = 2450000;
  game.state.holdings.kripto_solana = { units: 4, avgEntry: 2200000 };
  game.writeSaveImmediate();

  const savedRaw = mockStorage.getItem(game.CONFIG.STORAGE_KEY);
  const saved = JSON.parse(savedRaw);
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.holdings.kripto_solana, { units: 4, avgEntry: 2200000 });
  assert.equal(saved.lastPrices.kripto_solana, 2450000);
  assert.equal(saved.priceHistory, undefined, 'Riwayat 60 titik tidak boleh disimpan ke localStorage');

  // Muat ulang ke memori segar dan pastikan holdings, lastPrices, serta 60 titik grafik pulih
  game.state.holdings = {};
  game.state.lastPrices = {};
  game.state.priceHistory = {};
  game.loadState();

  assert.deepEqual(game.state.holdings.kripto_solana, { units: 4, avgEntry: 2200000 });
  assert.equal(game.state.lastPrices.kripto_solana, 2450000);
  assert.equal(game.state.priceHistory.kripto_solana.length, 60);
});

test('saveState menerapkan throttle 500ms (20 tap cepat <= 3 penulisan localStorage)', async function () {
  mockStorage.clear();
  game.resetAllData();
  mockStorage.resetWriteCount();

  for (let i = 0; i < 20; i += 1) {
    game.processTap(0, 0);
  }

  // Selama < 500ms, penulisan terjadwal belum dieksekusi berulang-ulang
  assert.ok(mockStorage.getWriteCount() <= 1);

  await new Promise(function (resolve) {
    setTimeout(resolve, 600);
  });

  assert.ok(
    mockStorage.getWriteCount() >= 1 && mockStorage.getWriteCount() <= 3,
    '20 tap cepat harus menghasilkan antara 1 hingga maksimal 3 penulisan localStorage'
  );

  const saved = JSON.parse(mockStorage.getItem(game.CONFIG.STORAGE_KEY));
  assert.equal(saved.balance, 20);
  assert.equal(saved.totalTaps, 20);
  assert.equal(saved.totalEarned, 20);
});

test('buyUpgrade mengurangi saldo, menaikkan perClick/perSecond, dan calculateOfflineBonus menghormati batas 2 jam', function () {
  mockStorage.clear();
  game.resetAllData();

  game.state.balance = 600;
  assert.equal(game.buyUpgrade('gloves'), true);
  assert.equal(game.state.balance, 585);
  assert.equal(game.state.perClick, 2);

  assert.equal(game.buyUpgrade('auto_team'), true);
  assert.equal(game.state.balance, 85);
  assert.equal(game.state.perClick, 27);
  assert.equal(game.state.perSecond, 10);

  // Offline 60 detik dengan rate Rp10/dtk dan efisiensi 50% => Rp300
  const oneMin = game.calculateOfflineBonus(10, 60 * 1000);
  assert.equal(oneMin.bonus, 300);

  // Offline 5 jam dibatasi maksimal 2 jam (7200 detik) => 10 * 7200 * 0.5 = Rp36.000
  const fiveHours = game.calculateOfflineBonus(10, 5 * 3600 * 1000);
  assert.equal(fiveHours.seconds, 7200);
  assert.equal(fiveHours.bonus, 36000);
});

test('Firebase payload builders & cloud portfolio restore mematuhi skema firebase-blueprint.json dan firestore.rules', function () {
  assert.equal(game.isValidFirebaseUserId('user_123-ABC'), true);
  assert.equal(game.isValidFirebaseUserId('bad/uid'), false);
  assert.equal(game.isValidFirebaseUserId(''), false);
  assert.equal(game.isValidAssetId('saham_apple'), true);
  assert.equal(game.isValidAssetId('bad/asset'), false);

  const stamp = { _type: 'serverTimestamp' };
  const profilePayload = game.buildUserPrivatePayload(
    {
      uid: 'abc_123',
      email: 'pemain@example.com',
      displayName: 'A'.repeat(150)
    },
    stamp
  );
  assert.equal(profilePayload.uid, 'abc_123');
  assert.equal(profilePayload.email, 'pemain@example.com');
  assert.equal(profilePayload.displayName.length, 100);
  assert.equal(profilePayload.updatedAt, stamp);

  const savePayload = game.buildPlayerSavePayload(
    'abc_123',
    {
      balance: -50,
      perClick: 12.345,
      perSecond: 4.5,
      totalTaps: 99.8,
      totalEarned: 2500.567,
      upgrades: { gloves: 3, tap_machine: 1, auto_team: 0 },
      milestones: ['taps_100', 'taps_100', 'earned_100'],
      settings: { sound: false, haptic: true },
      startDate: 1700000000000,
      clientSavedAt: 1700000500000
    },
    stamp
  );
  assert.deepEqual(Object.keys(savePayload).sort(), [
    'balance',
    'clientSavedAt',
    'milestones',
    'perClick',
    'perSecond',
    'settings',
    'startDate',
    'totalEarned',
    'totalTaps',
    'updatedAt',
    'upgrades',
    'userId',
    'version'
  ]);
  assert.equal(savePayload.version, 2);
  assert.equal(savePayload.balance, 0);
  assert.equal(savePayload.perClick, 12.35);
  assert.equal(savePayload.totalTaps, 99);
  assert.equal(savePayload.totalEarned, 2500.57);
  assert.deepEqual(savePayload.upgrades, { gloves: 3, tap_machine: 1, auto_team: 0 });
  assert.deepEqual(savePayload.milestones, ['taps_100', 'earned_100']);
  assert.deepEqual(savePayload.settings, { sound: false, haptic: true });
  assert.equal(savePayload.clientSavedAt, 1700000500000);

  const holdingPayload = game.buildPortfolioHoldingPayload(
    'abc_123',
    'saham_apple',
    { units: 5.7, avgEntry: 192.345 },
    stamp
  );
  assert.deepEqual(Object.keys(holdingPayload).sort(), [
    'assetId',
    'avgEntry',
    'units',
    'updatedAt',
    'userId'
  ]);
  assert.equal(holdingPayload.units, 5);
  assert.equal(holdingPayload.avgEntry, 192.35);
  assert.equal(
    game.buildPortfolioHoldingPayload('abc_123', 'saham_apple', { units: 0, avgEntry: 10 }, stamp),
    null
  );

  // Simulasikan login di perangkat baru: data portofolio & upgrade dari Firestore harus pulih penuh
  mockStorage.clear();
  game.resetAllData();
  const cloudSnapshot = {
    version: 2,
    balance: 125000,
    totalTaps: 420,
    totalEarned: 980000,
    upgrades: { gloves: 2, tap_machine: 1, auto_team: 1 },
    milestones: ['taps_100', 'earned_1000'],
    settings: { sound: false, haptic: true },
    startDate: 1700000000000,
    clientSavedAt: Date.now() + 5000,
    holdings: {
      saham_apple: { units: 4, avgEntry: 185.5 },
      kripto_bitcoin: { units: 2, avgEntry: 61200.25 }
    }
  };
  assert.equal(game.shouldRestoreCloudSave(cloudSnapshot), true);
  assert.equal(game.applyCloudSave(cloudSnapshot), true);
  assert.equal(game.state.balance, 125000);
  assert.equal(game.state.upgrades.gloves, 2);
  assert.equal(game.state.perClick, 33);
  assert.equal(game.state.perSecond, 10);
  assert.deepEqual(game.state.holdings.saham_apple, { units: 4, avgEntry: 185.5 });
  assert.deepEqual(game.state.holdings.kripto_bitcoin, { units: 2, avgEntry: 61200.25 });
  assert.equal(game.state.milestones.taps_100, true);
  assert.equal(game.state.settings.sound, false);
});

test('detail-chart: sliceTimeframePoints, smoothPriceSeries, computeSessionStats, candlestick, dan kurva Catmull-Rom', function () {
  const samplePoints = [];
  for (let i = 0; i < 60; i += 1) {
    samplePoints.push({
      ts: 1700000000000 + i * 3000,
      price: i % 2 === 0 ? 150 + i * 0.2 : 146 + i * 0.2
    });
  }

  // Timeframe slicing sesuai konfigurasi
  assert.equal(game.sliceTimeframePoints(samplePoints, '30d').length, 12);
  assert.equal(game.sliceTimeframePoints(samplePoints, '1m').length, 20);
  assert.equal(game.sliceTimeframePoints(samplePoints, '2m').length, 40);
  assert.equal(game.sliceTimeframePoints(samplePoints, 'all').length, 60);

  // Smoothing menjaga tepat titik awal & harga terakhir sambil meredam lonjakan zig-zag interior
  const rawSeries = samplePoints.map(function (pt) {
    return pt.price;
  });
  const smoothed = game.smoothPriceSeries(rawSeries, 2);
  assert.equal(smoothed.length, rawSeries.length);
  assert.equal(smoothed[0], rawSeries[0]);
  assert.equal(smoothed[smoothed.length - 1], rawSeries[rawSeries.length - 1]);

  let rawDiffSum = 0;
  let smoothDiffSum = 0;
  for (let i = 1; i < rawSeries.length; i += 1) {
    rawDiffSum += Math.abs(rawSeries[i] - rawSeries[i - 1]);
    smoothDiffSum += Math.abs(smoothed[i] - smoothed[i - 1]);
  }
  assert.ok(smoothDiffSum < rawDiffSum, 'Total variasi garis halus harus lebih kecil dari data mentah');

  // Statistik sesi
  const stats = game.computeSessionStats(
    samplePoints.slice(-12),
    samplePoints,
    { initialPrice: 150 }
  );
  assert.equal(stats.open, samplePoints[48].price);
  assert.equal(stats.close, samplePoints[59].price);
  assert.ok(stats.high >= stats.low);
  assert.ok(stats.sessionHigh >= stats.high);
  assert.ok(stats.sessionLow <= stats.low);

  // Lilin OHLC
  const candles = game.buildCandlestickBuckets(samplePoints, 3);
  assert.equal(candles.length, 20);
  candles.forEach(function (c) {
    assert.ok(c.high >= Math.max(c.open, c.close));
    assert.ok(c.low <= Math.min(c.open, c.close));
  });

  // Segmen Catmull-Rom
  const coords = [
    { x: 10, y: 100 },
    { x: 60, y: 70 },
    { x: 110, y: 90 },
    { x: 160, y: 40 }
  ];
  const segments = game.buildCatmullRomSegments(coords);
  assert.equal(segments.length, coords.length - 1);
  assert.equal(segments[segments.length - 1].endX, 160);
  assert.equal(segments[segments.length - 1].endY, 40);

  // Pastikan render grafik berjalan instan tanpa requestAnimationFrame
  let rafCalls = 0;
  const prevRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = function () {
    rafCalls += 1;
    return 1;
  };
  try {
    const noop = function () {};
    const mockCtx = {
      setTransform: noop,
      clearRect: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      quadraticCurveTo: noop,
      bezierCurveTo: noop,
      closePath: noop,
      stroke: noop,
      fill: noop,
      fillRect: noop,
      fillText: noop,
      rect: noop,
      clip: noop,
      save: noop,
      restore: noop,
      setLineDash: noop,
      arc: noop,
      createLinearGradient: function () {
        return { addColorStop: noop };
      }
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: function () {
        return mockCtx;
      },
      getBoundingClientRect: function () {
        return { left: 0, width: 390, height: 248 };
      }
    };
    game.renderDetailPriceChart(
      mockCanvas,
      { id: 'saham_apple', initialPrice: 150 },
      samplePoints,
      { timeframe: 'all', chartMode: 'line' }
    );
    assert.equal(rafCalls, 0);
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
  }
});

test('getAssetDetailProfile menyesuaikan Kripto & Forex tanpa dividen serta mempertahankan Saham', function () {
  const btcProfile = game.getAssetDetailProfile({
    id: 'kripto_bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    category: 'Kripto',
    yieldRate: 0
  });
  assert.equal(btcProfile.isContinuousMarket, true);
  assert.equal(btcProfile.hasDividends, false);
  assert.equal(btcProfile.showSessionTag, false);
  assert.equal(btcProfile.showMetaStrip, false);
  assert.equal(btcProfile.defaultStatsExpanded, true);
  assert.equal(btcProfile.displaySymbol, 'BTC / USD');
  assert.equal(btcProfile.displaySubtitle, 'Bitcoin');
  assert.equal(btcProfile.extraStatLabel, 'Harga Dasar');

  const forexProfile = game.getAssetDetailProfile({
    id: 'forex_eur_usd',
    name: 'EUR/USD',
    symbol: 'EUR',
    category: 'Forex',
    yieldRate: 0
  });
  assert.equal(forexProfile.isContinuousMarket, true);
  assert.equal(forexProfile.hasDividends, false);
  assert.equal(forexProfile.showSessionTag, false);
  assert.equal(forexProfile.showMetaStrip, false);
  assert.equal(forexProfile.displaySymbol, 'EUR / USD');
  assert.equal(forexProfile.displaySubtitle, 'Pasangan Mata Uang');
  assert.equal(forexProfile.extraStatLabel, 'Rentang 24j');

  const stockProfile = game.getAssetDetailProfile({
    id: 'saham_nvidia',
    name: 'Nvidia',
    symbol: 'NVDA',
    category: 'Saham',
    yieldRate: 0.0003
  });
  assert.equal(stockProfile.isContinuousMarket, false);
  assert.equal(stockProfile.hasDividends, true);
  assert.equal(stockProfile.showSessionTag, true);
  assert.equal(stockProfile.showMetaStrip, true);
  assert.equal(stockProfile.defaultStatsExpanded, false);
  assert.equal(stockProfile.displaySymbol, 'NVDA');
});

test('crypto-forex: memisahkan yield nol untuk Kripto & Forex vs dividen Saham serta pembaruan nilai real-time', function () {
  // Kripto dan Forex selalu yield = 0 meskipun yieldRate positif disisipkan
  assert.equal(game.isCryptoOrForexCategory('Kripto'), true);
  assert.equal(game.isCryptoOrForexCategory('Forex'), true);
  assert.equal(game.isCryptoOrForexCategory('Saham'), false);

  assert.equal(
    game.calculateAssetHourlyYield({ id: 'kripto_test', category: 'Kripto', yieldRate: 0.05 }, 10, 1000),
    0
  );
  assert.equal(
    game.calculateAssetHourlyYield({ id: 'forex_test', category: 'Forex', yieldRate: 0.02 }, 10, 1000),
    0
  );
  assert.equal(
    game.calculateAssetHourlyYield({ id: 'saham_test', category: 'Saham', yieldRate: 0.004 }, 3, 150000),
    1800
  );

  // Metrik 24 jam khusus Kripto & Forex
  const crypto24 = game.computeContinuousMarketMetrics(
    { category: 'Kripto', initialPrice: 1600000000, volatility: 0.03 },
    { sessionHigh: 1700000000, sessionLow: 1500000000 }
  );
  assert.equal(crypto24.extraStatLabel, 'Harga Dasar');
  assert.equal(crypto24.extraStatValue, 1600000000);

  const forex24 = game.computeContinuousMarketMetrics(
    { category: 'Forex', initialPrice: 17500, volatility: 0.002 },
    { sessionHigh: 17650, sessionLow: 17400 }
  );
  assert.equal(forex24.extraStatLabel, 'Rentang 24j');
  assert.equal(forex24.extraStatValue, 250);

  // Valuasi portofolio real-time: beli Bitcoin (Kripto) + EUR/USD (Forex), lalu ubah harga tick
  mockStorage.clear();
  game.resetAllData();
  game.state.balance = 5000000000;
  game.state.lastPrices.kripto_bitcoin = 1000000;
  game.state.lastPrices.forex_eur_usd = 20000;
  assert.equal(game.buyAsset('kripto_bitcoin', 2), true);
  assert.equal(game.buyAsset('forex_eur_usd', 5), true);

  // Yield total harus tetap 0 karena hanya memiliki Kripto & Forex
  assert.equal(game.getTotalInvestmentHourlyYield(), 0);
  const initialAlloc = game.getPortfolioAllocation();
  assert.equal(initialAlloc.total, 2100000);
  assert.equal(initialAlloc.byCategory.Kripto.hourlyYield, 0);
  assert.equal(initialAlloc.byCategory.Kripto.hasDividends, false);
  assert.equal(initialAlloc.byCategory.Forex.hourlyYield, 0);
  assert.equal(initialAlloc.byCategory.Forex.hasDividends, false);

  // Simulasikan perubahan harga pasar & verifikasi nilai portofolio langsung ikut berubah
  game.runPriceTick();
  const expectedTotal =
    2 * game.state.lastPrices.kripto_bitcoin + 5 * game.state.lastPrices.forex_eur_usd;
  const updatedAlloc = game.getPortfolioAllocation();
  assert.equal(Math.round(updatedAlloc.total * 100), Math.round(expectedTotal * 100));
  assert.equal(updatedAlloc.totalHourlyYield, 0);
  assert.equal(game.getTotalInvestmentHourlyYield(), 0);
});



