import fs from "node:fs"
import path from "node:path"
import { notifyAdmin, notifyClaimant } from "./mail.js"
import { storeFile } from "./store.js"

function file() {
  return storeFile("entries.json")
}

function read() {
  try {
    const parsed = JSON.parse(fs.readFileSync(file(), "utf8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries) {
  fs.mkdirSync(path.dirname(file()), { recursive: true })
  fs.writeFileSync(file(), JSON.stringify(entries, null, 2))
}

let chain = Promise.resolve()

export function listEntries() {
  return read()
}

export function updateEntries(mutator) {
  const run = chain.then(async () => {
    const entries = read()
    const result = await mutator(entries)
    write(entries)
    return result
  })
  chain = run.then(() => {}, () => {})
  return run
}

export function publicEntry(record) {
  return {
    id: record.id,
    prizeId: record.prizeId,
    prizeName: record.prizeName,
    cash: record.cash,
    name: record.name,
    email: record.email,
    phone: record.phone,
    country: record.country,
    createdAt: record.createdAt,
    referredBy: record.referredBy,
    bonusEntries: Number(record.bonusEntries) || 0,
    deskNotified: record.adminNotice === "sent",
  }
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
    status: "received",
    deliveryUrl: "",
    letterSentAt: "",
    adminNotice: "unconfigured",
  }
}

export async function handle(req, res) {
  const pathname = (req.url || "/").split("?")[0]
  const id = decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ""))

  if (req.method === "GET" && id) {
    const found = read().find((item) => item.id === id)
    if (!found) return send(res, 404, { error: "Not found" })
    return send(res, 200, publicEntry(found))
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
    let saved
    try {
      saved = await updateEntries((entries) => {
        const existing = entries.find((item) => item.email === record.email)
        if (existing) return { created: false, record: existing }
        const ref = String(body.referredBy || "").trim()
        if (ref && ref !== record.id) {
          const inviter = entries.find((item) => item.id === ref)
          if (inviter && inviter.email !== record.email) {
            record.referredBy = ref
            inviter.bonusEntries = (Number(inviter.bonusEntries) || 0) + 1
          }
        }
        entries.push(record)
        return { created: true, record }
      })
    } catch {
      return send(res, 500, { error: "Could not save the entry." })
    }
    if (saved.created) {
      await notifyClaimant(saved.record)
      const notice = await notifyAdmin(saved.record)
      saved.record.adminNotice = notice
      try {
        await updateEntries((entries) => {
          const item = entries.find((entry) => entry.id === saved.record.id)
          if (item) item.adminNotice = notice
        })
      } catch {
        saved.record.adminNotice = "failed"
      }
    }
    return send(res, saved.created ? 201 : 200, publicEntry(saved.record))
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
