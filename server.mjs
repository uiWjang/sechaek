import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { config } from "./js/config.js";
const root = fileURLToPath(new URL(".", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
export function makeServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/api/catalog") {
        if (req.method !== "POST") {
          res.writeHead(405);
          return res.end();
        }
        const origin = req.headers.origin;
        if (
          origin &&
          !["http://127.0.0.1:5174", "http://localhost:5174"].includes(origin)
        ) {
          res.writeHead(403);
          return res.end();
        }
        let bytes = 0,
          chunks = [];
        for await (const part of req) {
          bytes += part.length;
          if (bytes > 4096) {
            res.writeHead(413);
            return res.end();
          }
          chunks.push(part);
        }
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          res.writeHead(400);
          return res.end();
        }
        if (!["search", "chart", "detail", "resolve"].includes(body.action)) {
          res.writeHead(400);
          return res.end();
        }
        const upstream = await fetch(config.url + "/functions/v1/yes24", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: config.key },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(25000),
        });
        res.writeHead(upstream.status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        return res.end(await upstream.text());
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        return res.end();
      }
      const pathname = decodeURIComponent(
        url.pathname === "/" ? "/index.html" : url.pathname,
      );
      if (!(
        /^\/[a-z-]+\.html$/.test(pathname) ||
        /^\/(css|js|vendor|assets)\//.test(pathname)
      )) {
        res.writeHead(404);
        return res.end();
      }
      const file = resolve(root, "." + pathname);
      if (!file.startsWith(resolve(root) + sep)) {
        res.writeHead(403);
        return res.end();
      }
      const buffer = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : buffer);
    } catch (e) {
      res.writeHead(e.name === "TimeoutError" ? 504 : 404, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(
        JSON.stringify({
          error:
            e.name === "TimeoutError"
              ? "도서 조회 시간이 초과되었습니다. 다시 시도해 주세요."
              : "요청한 파일 또는 데이터를 불러오지 못했습니다.",
        }),
      );
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = makeServer();
  server.on("error", (e) => {
    console.error(
      e.code === "EADDRINUSE"
        ? "HTML 버전이 이미 실행 중입니다. http://127.0.0.1:5174 를 여세요."
        : e.message,
    );
    process.exitCode = 1;
  });
  server.listen(5174, "127.0.0.1", () =>
    console.log(
      "세책 HTML 버전: http://127.0.0.1:5174\n종료: Ctrl+C. 기존 React 사이트와 다른 포트를 사용합니다.",
    ),
  );
}
