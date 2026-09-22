(function () {
  const MARKETS = [
    { label: "USD/BRL (OTC)", symbol: "USDBRL=X" },
    { label: "EUR/USD", symbol: "EURUSD=X" },
    { label: "GBP/USD", symbol: "GBPUSD=X" },
    { label: "USD/JPY", symbol: "USDJPY=X" },
    { label: "USD/CHF", symbol: "USDCHF=X" },
    { label: "AUD/USD", symbol: "AUDUSD=X" },
    { label: "USD/CAD", symbol: "USDCAD=X" },
    { label: "NZD/USD", symbol: "NZDUSD=X" },
    { label: "EUR/GBP", symbol: "EURGBP=X" },
    { label: "EUR/JPY", symbol: "EURJPY=X" },
    { label: "GBP/JPY", symbol: "GBPJPY=X" },
    { label: "AUD/JPY", symbol: "AUDJPY=X" },
    { label: "EUR/AUD", symbol: "EURAUD=X" },
    { label: "EUR/CAD", symbol: "EURCAD=X" },
    { label: "GBP/AUD", symbol: "GBPAUD=X" },
    { label: "USD/MXN", symbol: "USDMXN=X" },
    { label: "USD/TRY", symbol: "USDTRY=X" },
    { label: "USD/ZAR", symbol: "USDZAR=X" },
    { label: "USD/INR", symbol: "USDINR=X" },
    { label: "USD/PKR", symbol: "USDPKR=X" },
    { label: "EUR/CHF", symbol: "EURCHF=X" },
    { label: "CAD/JPY", symbol: "CADJPY=X" },
    { label: "CHF/JPY", symbol: "CHFJPY=X" },
    { label: "XAU/USD", symbol: "GC=F" },
    { label: "XAG/USD", symbol: "SI=F" },
    { label: "BTC/USD", symbol: "BTC-USD" },
    { label: "ETH/USD", symbol: "ETH-USD" },
    { label: "BNB/USD", symbol: "BNB-USD" },
    { label: "SOL/USD", symbol: "SOL-USD" },
    { label: "XRP/USD", symbol: "XRP-USD" },
    { label: "DOGE/USD", symbol: "DOGE-USD" },
    { label: "ADA/USD", symbol: "ADA-USD" },
    { label: "LTC/USD", symbol: "LTC-USD" },
    { label: "NASDAQ 100", symbol: "NQ=F" },
    { label: "S&P 500", symbol: "ES=F" },
    { label: "Dow Jones", symbol: "YM=F" },
    { label: "USD/BDT", symbol: "USDBDT=X" },
    { label: "GBP/CHF", symbol: "GBPCHF=X" },
    { label: "AUD/CAD", symbol: "AUDCAD=X" },
    { label: "NZD/JPY", symbol: "NZDJPY=X" },
    { label: "EUR/NZD", symbol: "EURNZD=X" }
  ];

  const els = {
    clock: document.getElementById("clock"),
    search: document.getElementById("marketSearch"),
    marketBtn: document.getElementById("marketBtn"),
    marketValue: document.getElementById("marketValue"),
    marketSelect: document.getElementById("market"),
    sheet: document.getElementById("marketSheet"),
    list: document.getElementById("marketList"),
    count: document.getElementById("marketCount"),
    empty: document.getElementById("marketEmpty"),
    btnScan: document.getElementById("btnScan"),
    tapLabel: document.getElementById("tapLabel"),
    radar: document.getElementById("radar"),
    hint: document.getElementById("hint"),
    result: document.getElementById("result"),
    scanDone: document.getElementById("scanDone"),
    resMarket: document.getElementById("resMarket"),
    resEntry: document.getElementById("resEntry"),
    resTrend: document.getElementById("resTrend"),
    resSignal: document.getElementById("resSignal"),
    resCount: document.getElementById("resCount"),
    btnAgain: document.getElementById("btnAgain")
  };

  let selected = MARKETS[0];
  let countdownTimer = null;
  let busy = false;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickClock() {
    const d = new Date();
    els.clock.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function renderMarkets(filter) {
    const q = (filter || "").trim().toLowerCase();
    const items = MARKETS.filter(function (m) {
      return !q || m.label.toLowerCase().indexOf(q) !== -1 || m.symbol.toLowerCase().indexOf(q) !== -1;
    });
    els.list.innerHTML = "";
    els.count.textContent = String(items.length);
    els.empty.classList.toggle("hidden", items.length > 0);
    items.forEach(function (m) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "market-item" + (m.symbol === selected.symbol ? " active" : "");
      btn.textContent = m.label;
      btn.addEventListener("click", function () {
        selectMarket(m);
      });
      els.list.appendChild(btn);
    });
    els.marketSelect.innerHTML = "";
    MARKETS.forEach(function (m) {
      const opt = document.createElement("option");
      opt.value = m.symbol;
      opt.textContent = m.label;
      if (m.symbol === selected.symbol) opt.selected = true;
      els.marketSelect.appendChild(opt);
    });
  }

  function selectMarket(m) {
    selected = m;
    els.marketValue.textContent = m.label;
    els.sheet.classList.remove("open");
    renderMarkets(els.search.value);
  }

  function setBusy(on) {
    busy = on;
    els.btnScan.disabled = on;
    els.btnAgain.disabled = on;
    els.radar.classList.toggle("scanning", on);
    els.hint.textContent = on ? "Scanning live candles..." : "Tap the logo to scan";
    els.tapLabel.textContent = on ? "SCANNING" : "TAP TO SCAN";
  }

  function classify(candles) {
    const slice = candles.slice(-12);
    if (!slice.length) return { trend: "FLAT", signal: "WAIT", dir: "" };
    let up = 0;
    let down = 0;
    let body = 0;
    slice.forEach(function (c) {
      const d = c.close - c.open;
      body += d;
      if (d > 0) up += 1;
      else if (d < 0) down += 1;
    });
    const last = slice[slice.length - 1];
    const lastBody = last.close - last.open;
    const range = last.high - last.low || 1;
    const closePos = (last.close - last.low) / range;
    let score = body + lastBody * 1.4 + (closePos - 0.5) * Math.abs(lastBody || 0.0001);
    if (up > down) score += 0.0001;
    if (down > up) score -= 0.0001;
    if (score > 0) return { trend: "BULLISH", signal: "UP", dir: "up" };
    if (score < 0) return { trend: "BEARISH", signal: "DOWN", dir: "down" };
    return { trend: "FLAT", signal: "WAIT", dir: "" };
  }

  function nextMinute() {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    return d;
  }

  function startCountdown(target) {
    if (countdownTimer) clearInterval(countdownTimer);
    function tick() {
      const left = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
      const m = Math.floor(left / 60);
      const s = left % 60;
      els.resCount.textContent = pad(m) + ":" + pad(s);
      if (left <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
    tick();
    countdownTimer = setInterval(tick, 250);
  }

  async function scan() {
    if (busy) return;
    setBusy(true);
    els.result.classList.add("hidden");
    try {
      const res = await fetch("/api/candles?symbol=" + encodeURIComponent(selected.symbol));
      const data = await res.json();
      if (!res.ok || !data.candles || !data.candles.length) {
        throw new Error((data && data.error) || "no candles");
      }
      const verdict = classify(data.candles);
      const entry = nextMinute();
      els.resMarket.textContent = selected.label;
      els.resEntry.textContent = pad(entry.getHours()) + ":" + pad(entry.getMinutes());
      els.resTrend.textContent = verdict.trend;
      els.resSignal.textContent = verdict.signal;
      els.resTrend.className = "trend " + verdict.dir;
      els.resSignal.className = "signal " + verdict.dir;
      els.scanDone.textContent = "Scan completed Entry +1 minute";
      els.result.classList.remove("hidden");
      startCountdown(entry);
    } catch (err) {
      els.result.classList.remove("hidden");
      els.scanDone.textContent = "Live feed failed. Try again.";
      els.resMarket.textContent = selected.label;
      els.resEntry.textContent = "--:--";
      els.resTrend.textContent = "N/A";
      els.resSignal.textContent = "RETRY";
      els.resTrend.className = "trend";
      els.resSignal.className = "signal";
      els.resCount.textContent = "--";
    } finally {
      setBusy(false);
    }
  }

  els.search.addEventListener("input", function () {
    renderMarkets(els.search.value);
    els.sheet.classList.add("open");
  });
  els.marketBtn.addEventListener("click", function () {
    els.sheet.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (!els.sheet.contains(e.target) && e.target !== els.marketBtn && !els.marketBtn.contains(e.target) && e.target !== els.search) {
      els.sheet.classList.remove("open");
    }
  });
  els.btnScan.addEventListener("click", scan);
  els.radar.addEventListener("click", scan);
  els.btnAgain.addEventListener("click", scan);

  renderMarkets("");
  tickClock();
  setInterval(tickClock, 1000);
})();
