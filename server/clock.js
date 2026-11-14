import fs from "node:fs"
import path from "node:path"
import { storeFile } from "./store.js"

function file() {
  return storeFile("draw-end.json")
}

export function readDrawEnd() {
  try {
    const end = Number(JSON.parse(fs.readFileSync(file(), "utf8")).end)
    return Number.isFinite(end) ? end : null
  } catch {
    return null
  }
}

export function writeDrawEnd(end) {
  fs.mkdirSync(path.dirname(file()), { recursive: true })
  fs.writeFileSync(file(), JSON.stringify({ end }))
  return end
}

export function drawApi() {
  const middleware = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next()
    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ end: readDrawEnd() }))
  }
  return {
    name: "draw-api",
    configureServer(server) {
      server.middlewares.use("/api/draw", middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/draw", middleware)
    },
  }
}
