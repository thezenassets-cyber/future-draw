import fs from "node:fs"
import path from "node:path"
import { deliveryLink, notifyAdmin, notifyClaimant, publicMailError, sendSelection } from "./mail.js"
import { storageReport, storeFile } from "./store.js"

function file() {
  return storeFile("entries.json")
}

function journalPath() {
  return storeFile("entries.jsonl")
}

function readFile(target) {
  const text = fs.readFileSync(target, "utf8")
  if (!text.trim()) return []
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error("Claims file is not a list.")
  return parsed
}

function readListFile() {
  const target = file()
  const backup = `${target}.bak`
  if (!fs.existsSync(target)) return null
  try {
    return readFile(target)
  } catch (error) {
    if (!fs.existsSync(backup)) return null
    try {
      return readFile(backup)
    } catch {
      return null
    }
  }
}

function materializeJournal() {
  const target = journalPath()
  if (!fs.existsSync(target)) return []
  const state = new Map()
  for (const line of fs.readFileSync(target, "utf8").split("\n")) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      if (event.op === "remove" && event.id) state.delete(event.id)
      else if (event.op === "upsert" && event.record?.id) state.set(event.record.id, event.record)
    } catch {
      // A torn line is skipped. The next complete line still applies.
    }
  }
  return [...state.values()]
}

function writeList(entries) {
  const target = file()
  const directory = path.dirname(target)
  fs.mkdirSync(directory, { recursive: true })
  const temp = path.join(directory, `.${path.basename(target)}.${process.pid}.tmp`)
  fs.writeFileSync(temp, JSON.stringify(entries, null, 2))
  try {
    fs.renameSync(temp, target)
  } catch {
    fs.copyFileSync(temp, target)
    fs.unlinkSync(temp)
  }
  fs.copyFileSync(target, `${target}.bak`)
}

function appendJournal(events) {
  if (!events.length) return
  const target = journalPath()
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.appendFileSync(target, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`)
}

function read() {
  if (!storageReport().durable) return []
  const fromJournal = materializeJournal()
  const fromFile = readListFile()
  if (!fromFile) {
    if (fromJournal.length) writeList(fromJournal)
    return fromJournal
  }
  const fileIds = new Set(fromFile.map((item) => item.id))
  const missing = fromJournal.filter((item) => item?.id && !fileIds.has(item.id))
  if (!missing.length) return fromFile
  const restored = [...fromFile, ...missing]
  writeList(restored)
  return restored
}

function write(entries, removedIds = []) {
  const at = new Date().toISOString()
  appendJournal([
    ...removedIds.map((id) => ({ op: "remove", id, at })),
    ...entries.map((record) => ({ op: "upsert", record, at })),
  ])
  writeList(entries)
}

let chain = Promise.resolve()

const selectionWait = 60 * 1000
const selectionSite = "https://futuredraw.live"
const selectionSending = new Set()

export function listEntries() {
  return read()
}

export function dueSelections(entries, now = Date.now()) {
  return entries.filter((item) => {
    if (!item?.id || !item.letterDueAt || item.letterSentAt) return false
    if (item.status === "closed" || item.status === "review") return false
    if ((Number(item.letterAttempts) || 0) >= 3) return false
    const at = Date.parse(item.letterDueAt)
    return Number.isFinite(at) && at <= now
  })
}

export function reserveSelection(id) {
  if (!id || selectionSending.has(id)) return false
  selectionSending.add(id)
  return true
}

export function releaseSelection(id) {
  selectionSending.delete(id)
}

export async function releaseDueLetters(now = Date.now()) {
  if (!storageReport().durable) return
  const due = dueSelections(listEntries(), now)
  for (const item of due) {
    if (!reserveSelection(item.id)) continue
    try {
      const fresh = listEntries().find((entry) => entry.id === item.id)
      if (!fresh?.letterDueAt || fresh.letterSentAt) continue
      if (fresh.status === "closed" || fresh.status === "review") continue
      const link = deliveryLink(fresh.deliveryUrl) || selectionSite
      try {
        await sendSelection(fresh, link, fresh.email)
        await updateEntries((entries) => {
          const current = entries.find((entry) => entry.id === item.id)
          if (!current || current.letterSentAt) return
          const held = current.status === "closed" || current.status === "review"
          current.deliveryUrl = link
          current.letterSentAt = new Date().toISOString()
          current.letterSentTo = current.email
          current.letterError = ""
          current.letterDueAt = ""
          if (!held) current.status = "selected"
        })
      } catch (error) {
        const attempts = (Number(fresh.letterAttempts) || 0) + 1
        await updateEntries((entries) => {
          const current = entries.find((entry) => entry.id === item.id)
          if (!current || current.letterSentAt) return
          const held = current.status === "closed" || current.status === "review" || !current.letterDueAt
          current.letterAttempts = attempts
          current.letterError = publicMailError(error)
          current.letterSentAt = ""
          current.letterSentTo = current.email
          current.letterDueAt = held || attempts >= 3 ? "" : new Date(Date.now() + attempts * selectionWait).toISOString()
        })
      }
    } finally {
      releaseSelection(item.id)
    }
  }
}

let selectionTimer = null

export function startSelectionDesk() {
  if (selectionTimer) return
  selectionTimer = setInterval(() => {
    releaseDueLetters().catch(() => {})
  }, 5000)
  selectionTimer.unref?.()
  releaseDueLetters().catch(() => {})
}

export function updateEntries(mutator, options = {}) {
  const run = chain.then(async () => {
    const entries = read()
    const before = entries.map((item) => item.id)
    const result = await mutator(entries)
    const ids = new Set(entries.map((item) => item.id))
    const removed = before.filter((id) => !ids.has(id))
    if (!options.allowShrink && removed.length) {
      throw new Error("Existing claims are kept until the desk removes one.")
    }
    write(entries, removed)
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
  res.setHeader("Cache-Control", "no-store")
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

function newId(entries) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const used = new Set(entries.map((item) => item.id))
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let body = ""
    for (let index = 0; index < 6; index += 1) {
      body += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    const id = `MD-${body}`
    if (!used.has(id)) return id
  }
  return `MD-${Date.now().toString(36).slice(-6).toUpperCase()}`
}

function clean(body, entries = []) {
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const supplied = String(body.id || "").trim()
  const id = /^MD-[A-Z0-9]{6}$/.test(supplied) ? supplied : newId(entries)
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
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
    adminNotice: "unsent",
  }
}

export function buildClaim(body, entries = []) {
  return clean(body, entries)
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
    const record = clean(body, [])
    if (!record) return send(res, 400, { error: "Invalid entry." })
    record.letterDueAt = new Date(Date.now() + selectionWait).toISOString()
    record.letterAttempts = 0
    let saved
    try {
      saved = await updateEntries((entries) => {
        const sameEmail = entries.some((item) => item.email === record.email)
        const ref = String(body.referredBy || "").trim()
        if (!sameEmail && ref && ref !== record.id) {
          const inviter = entries.find((item) => item.id === ref)
          if (inviter && inviter.email !== record.email) {
            record.referredBy = ref
            inviter.bonusEntries = (Number(inviter.bonusEntries) || 0) + 1
          }
        }
        if (entries.some((item) => item.id === record.id)) {
          record.id = newId(entries)
        }
        entries.push(record)
        return { created: true, record }
      })
    } catch (error) {
      const status = error.status || 500
      return send(res, status, { error: error.status ? error.message : "Could not save the entry." })
    }
    if (saved.created) {
      const claimant = await notifyClaimant(saved.record)
      const notice = await notifyAdmin(saved.record)
      const at = new Date().toISOString()
      saved.record.entryMail = claimant.status
      saved.record.entryMailAt = at
      saved.record.entryMailTo = saved.record.email
      saved.record.entryMailError = claimant.error
      saved.record.adminNotice = notice.status
      saved.record.adminNoticeAt = at
      saved.record.adminNoticeError = notice.error
      try {
        await updateEntries((entries) => {
          const item = entries.find((entry) => entry.id === saved.record.id)
          if (!item) return
          item.entryMail = claimant.status
          item.entryMailAt = at
          item.entryMailTo = saved.record.email
          item.entryMailError = claimant.error
          item.adminNotice = notice.status
          item.adminNoticeAt = at
          item.adminNoticeError = notice.error
        })
      } catch {
        saved.record.adminNotice = "failed"
        saved.record.entryMail = saved.record.entryMail === "sent" ? "sent" : "failed"
      }
    }
    return send(res, saved.created ? 201 : 200, publicEntry(saved.record))
  }

  return send(res, 404, { error: "Not found" })
}

export function entriesApi() {
  const middleware = (req, res, next) => {
    handle(req, res).catch((error) => {
      if (!res.headersSent) {
        const status = error.status || 500
        send(res, status, { error: error.status ? error.message : "Could not save the entry." })
      } else next()
    })
  }
  return {
    name: "entries-api",
    configureServer(server) {
      startSelectionDesk()
      server.middlewares.use("/api/entries", middleware)
    },
    configurePreviewServer(server) {
      startSelectionDesk()
      server.middlewares.use("/api/entries", middleware)
    },
  }
}
