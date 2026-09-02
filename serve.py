#!/usr/bin/env python3
"""
Lokale ontwikkelserver die bij een onbestaande pagina de eigen 404.html
teruggeeft, zodat lokaal testen hetzelfde gedrag laat zien als op een
echte host (Netlify, GitHub Pages, Apache met ErrorDocument, enz.).

Gebruik:  python serve.py [poort]   (standaard poort 5173)

Stuurt bewust "Cache-Control: no-store" mee op elk bestand, zodat de browser
nooit een oude, gecachte versie van een CSS/JS-bestand laat zien na een
bewerking - precies het soort verwarrende "waarom werkt mijn wijziging niet"
probleem dat een lokale ontwikkelserver moet voorkomen.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            not_found_path = os.path.join(ROOT, "404.html")
            if os.path.isfile(not_found_path):
                with open(not_found_path, "rb") as f:
                    body = f.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().send_error(code, message, explain)


if __name__ == "__main__":
    os.chdir(ROOT)
    with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{PORT}")
        httpd.serve_forever()
