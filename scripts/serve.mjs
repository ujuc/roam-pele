import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = {
  "README.md": "text/markdown; charset=utf-8",
  "CHANGELOG.md": "text/markdown; charset=utf-8",
  "extension.js": "text/javascript; charset=utf-8",
  "extension.css": "text/css; charset=utf-8",
};
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Private-Network": "true",
  "Cache-Control": "no-store",
};

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "*",
    });
    return res.end();
  }
  const name = new URL(req.url ?? "/", "http://localhost").pathname.slice(1);
  if (!Object.hasOwn(types, name)) {
    res.writeHead(404, headers);
    return res.end("Not found");
  }
  try {
    const body = await readFile(root + name);
    res.writeHead(200, { ...headers, "Content-Type": types[name] });
    res.end(body);
  } catch {
    // extension.js is absent until `npm run build` has run
    res.writeHead(404, headers);
    res.end("Not found");
  }
}).listen(8765, () => console.log("Serving on http://localhost:8765"));
