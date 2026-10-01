import http.server
import socketserver
import urllib.request
import ssl
import sys

PORT = 8080

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class CCTVProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/stream/'):
            # Proxy request to ubonwaterlevel.duckdns.org
            subpath = self.path[len('/api/stream/'):]
            target_url = f'https://ubonwaterlevel.duckdns.org/wowza/{subpath}'
            try:
                req = urllib.request.Request(target_url, headers={
                    'User-Agent': 'Mozilla/5.0'
                })
                with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                    data = resp.read()
                    content_type = resp.headers.get('Content-Type', 'application/vnd.apple.mpegurl')
                    
                    self.send_response(resp.status)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(len(data)))
                    # Send SINGLE Access-Control-Allow-Origin
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-cache')
                    http.server.SimpleHTTPRequestHandler.end_headers(self)
                    self.wfile.write(data)
            except Exception as e:
                self.send_error(502, f"Proxy Error: {e}")
        else:
            super().do_GET()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), CCTVProxyHandler) as httpd:
        print(f"CCTV Server running at http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
