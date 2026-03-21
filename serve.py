#!/usr/bin/env python3
"""
TradeMasterView - Production SPA Server with API Reverse Proxy
==============================================================
Serves dist/ static files with:
  1. SPA fallback (all non-file routes → index.html for Vue Router)
  2. /api/* reverse proxy → TradeMaster API (localhost:8080)
  3. /health endpoint for service monitoring

This eliminates hardcoded API URLs in the front-end build.
"""
import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

PORT = 3000
API_UPSTREAM = "http://127.0.0.1:8080"
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Health endpoint for this server
        if self.path == "/health" or self.path == "/health/":
            return self._serve_health()

        # Proxy /api/* to upstream
        if self.path.startswith("/api/") or self.path.startswith("/api?"):
            return self._proxy_to_api()

        # Proxy /health to upstream too (for backward compat)
        if self.path.startswith("/api-health"):
            self.path = "/health"
            return self._proxy_to_api()

        # Static file or SPA fallback
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            return super().do_GET()

        # SPA fallback: serve index.html for any unmatched route
        self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy_to_api()
        self.send_error(405, "Method Not Allowed")

    def do_PUT(self):
        if self.path.startswith("/api/"):
            return self._proxy_to_api()
        self.send_error(405, "Method Not Allowed")

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            return self._proxy_to_api()
        self.send_error(405, "Method Not Allowed")

    def do_OPTIONS(self):
        # CORS preflight for API proxy
        if self.path.startswith("/api/"):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Max-Age", "3600")
            self.end_headers()
            return
        self.send_error(405)

    def _serve_health(self):
        """Health check: verifies this server + upstream API."""
        api_ok = False
        api_detail = "unknown"
        try:
            req = urllib.request.Request(f"{API_UPSTREAM}/health", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                api_ok = data.get("status") == "ok"
                api_detail = "ok" if api_ok else str(data)
        except Exception as e:
            api_detail = str(e)[:200]

        result = {
            "service": "TradeMasterView",
            "status": "ok" if api_ok else "degraded",
            "view_server": "ok",
            "api_upstream": api_detail,
            "port": PORT,
            "dist_dir": DIST_DIR,
            "timestamp": datetime.now().isoformat()
        }
        body = json.dumps(result, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_to_api(self):
        """Reverse-proxy request to TradeMaster API upstream."""
        url = f"{API_UPSTREAM}{self.path}"

        # Read request body if present
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        try:
            req = urllib.request.Request(url, data=body, method=self.command)
            # Forward relevant headers
            for header in ("Content-Type", "Authorization", "Accept"):
                val = self.headers.get(header)
                if val:
                    req.add_header(header, val)

            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                # Forward response headers
                for key in ("Content-Type", "Cache-Control"):
                    val = resp.headers.get(key)
                    if val:
                        self.send_header(key, val)
                self.send_header("Content-Length", len(resp_body))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp_body)

        except urllib.error.HTTPError as e:
            resp_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "text/plain"))
            self.send_header("Content-Length", len(resp_body))
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            err = json.dumps({"error": "API upstream unavailable", "detail": str(e)[:200]}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", len(err))
            self.end_headers()
            self.wfile.write(err)

    def log_message(self, format, *args):
        ts = datetime.now().strftime("%H:%M:%S")
        sys.stderr.write(f"[TMView {ts}] {self.client_address[0]} - {format % args}\n")


if __name__ == "__main__":
    print(f"🌐 TradeMasterView serving on http://127.0.0.1:{PORT}")
    print(f"   dist/  → {DIST_DIR}")
    print(f"   /api/* → {API_UPSTREAM}")
    
    class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
    
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SPAProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        server.server_close()
