const http = require("http");
const fs = require("fs");
const path = require("path");

// Local preview server for this static tree. Not part of production hosting.
// Usage: `npm run serve` from this folder, then open http://localhost:4173/
const ROOT = __dirname;
const PORT = process.env.DOCS_PORT ? Number(process.env.DOCS_PORT) : 4173;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "text/xml", ".txt": "text/plain", ".svg": "image/svg+xml" };
http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  try {
    if (fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    const body = fs.readFileSync(f);
    s.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "text/html" });
    s.end(body);
  } catch (e) { s.writeHead(404); s.end("not found"); }
}).listen(PORT, () => console.log(`docs preview on http://localhost:${PORT}/`));
