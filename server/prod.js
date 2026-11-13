import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { handle } from "./entries-api.js"
import { handleTestMail } from "./mail.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist")
const port = Number(process.env.PORT) || 10000

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

function sendFile(res, file, cache) {
  res.statusCode = 200
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream")
  res.setHeader("Cache-Control", cache)
  fs.createReadStream(file).pipe(res)
}

function serveSite(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1")
  const pathname = decodeURIComponent(url.pathname)
  if (pathname.includes("\0") || pathname.split("/").includes("..")) {
    res.statusCode = 400
    res.end("Bad request")
    return
  }
  const file = path.join(root, pathname)
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const hashed = pathname.startsWith("/assets/")
    sendFile(res, file, hashed ? "public, max-age=31536000, immutable" : "public, max-age=86400")
    return
  }
  sendFile(res, path.join(root, "index.html"), "no-cache")
}

const server = http.createServer((req, res) => {
  const url = req.url || "/"
  if (url === "/health" || url.startsWith("/health?")) {
    res.statusCode = 200
    res.setHeader("Content-Type", "text/plain; charset=utf-8")
    res.end("ok")
    return
  }
  if (url === "/api/admin/test-mail" || url.startsWith("/api/admin/test-mail?")) {
    handleTestMail(req, res).catch(() => {
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: "The letter could not be sent." }))
      }
    })
    return
  }
  if (url === "/api/entries" || url.startsWith("/api/entries/") || url.startsWith("/api/entries?")) {
    req.url = url.slice("/api/entries".length) || "/"
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: "Could not save the entry." }))
      }
    })
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405
    res.end("Method not allowed")
    return
  }
  serveSite(req, res)
})

server.listen(port, "0.0.0.0", () => {
  console.log(`Future Draw listening on 0.0.0.0:${port}`)
})
