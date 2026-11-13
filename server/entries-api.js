import fs from "node:fs"
import path from "node:path"

const file = path.resolve("data/entries.json")

function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(entries, null, 2))
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8")
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })
}

function clean(body) {
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const id = String(body.id || "").trim()
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (!/^MD-[A-Z2-9]{6}$/.test(id)) return null
  return {
    id,
    prizeId: String(body.prizeId || ""),
    prizeName: String(body.prizeName || ""),
    cash: Number(body.cash) || 0,
    name,
    email,
    phone: String(body.phone || "").trim(),
    country: String(body.country || ""),
    createdAt: new Date().toISOString(),
    referredBy: null,
    bonusEntries: 0,
  }
}

export async function handle(req, res) {
  const pathname = (req.url || "/").split("?")[0]
  const id = decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ""))

  if (req.method === "GET" && id) {
    const found = read().find((item) => item.id === id)
    if (!found) return send(res, 404, { error: "Not found" })
    return send(res, 200, found)
  }

  if (req.method === "POST" && !id) {
    let body
    try {
      body = req.body && typeof req.body === "object" ? req.body : await readBody(req)
    } catch {
      return send(res, 400, { error: "Invalid entry." })
    }
    const record = clean(body)
    if (!record) return send(res, 400, { error: "Invalid entry." })
    const entries = read()
    const existing = entries.find((item) => item.email === record.email)
    if (existing) return send(res, 200, existing)

    const ref = String(body.referredBy || "").trim()
    if (ref && ref !== record.id) {
      const inviter = entries.find((item) => item.id === ref)
      if (inviter && inviter.email !== record.email) {
        record.referredBy = ref
        inviter.bonusEntries = (Number(inviter.bonusEntries) || 0) + 1
      }
    }
    entries.push(record)
    write(entries)
    return send(res, 201, record)
  }

  return send(res, 404, { error: "Not found" })
}

export function entriesApi() {
  const middleware = (req, res, next) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) send(res, 500, { error: "Could not save the entry." })
      else next()
    })
  }
  return {
    name: "entries-api",
    configureServer(server) {
      server.middlewares.use("/api/entries", middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/entries", middleware)
    },
  }
}
