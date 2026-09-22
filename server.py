#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1m&range=1d"


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/candles":
            self.handle_candles(parsed)
            return
        return super().do_GET()

    def handle_candles(self, parsed):
        qs = urllib.parse.parse_qs(parsed.query)
        symbol = (qs.get("symbol") or [""])[0]
        if not symbol or len(symbol) > 24:
            self.send_json(400, {"error": "bad symbol"})
            return
        url = YAHOO.format(sym=urllib.parse.quote(symbol))
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 SignalMaster/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            self.send_json(502, {"error": "feed unavailable", "detail": str(exc)})
            return
        result = ((raw.get("chart") or {}).get("result") or [None])[0]
        if not result:
            self.send_json(404, {"error": "no data"})
            return
        ts = result.get("timestamp") or []
        quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        closes = quote.get("close") or []
        candles = []
        for i, t in enumerate(ts):
            o, h, l, c = (
                opens[i] if i < len(opens) else None,
                highs[i] if i < len(highs) else None,
                lows[i] if i < len(lows) else None,
                closes[i] if i < len(closes) else None,
            )
            if None in (o, h, l, c):
                continue
            candles.append({"t": t, "open": o, "high": h, "low": l, "close": c})
        self.send_json(200, {"symbol": symbol, "candles": candles[-80:]})

    def send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Signal Master on http://0.0.0.0:%s" % PORT, flush=True)
    httpd.serve_forever()
