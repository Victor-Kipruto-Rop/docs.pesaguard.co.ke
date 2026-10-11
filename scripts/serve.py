from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parent.parent


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        request = urlsplit(self.path)
        pathname = unquote(request.path)
        lower_path = pathname.lower()

        if lower_path.endswith("/index.html") or lower_path == "/index.html":
            clean_path = pathname[: -len("index.html")]
        elif lower_path.endswith(".html"):
            clean_path = pathname[:-len(".html")]
        else:
            return super().send_head()

        location = urlunsplit(("", "", clean_path or "/", request.query, ""))
        self.send_response(301)
        self.send_header("Location", location)
        self.end_headers()
        return None

    def translate_path(self, request_path):
        translated = Path(super().translate_path(request_path))
        if translated.exists():
            return str(translated)

        html_file = Path(str(translated) + ".html")
        if html_file.is_file():
            return str(html_file)
        return str(translated)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), CleanUrlHandler)
    print(f"Documentation preview: http://127.0.0.1:{port}/")
    server.serve_forever()
