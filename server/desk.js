import { writeDrawEnd } from "./clock.js"
import { listEntries, updateEntries, buildClaim } from "./entries-api.js"
import { deliveryLink, handleTestMail, mailStatus, notifyAdmin, sendCustomerNote, sendSelection } from "./mail.js"

const standings = new Set(["received", "review", "selected", "closed"])

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

function authorized(req) {
  const expected = process.env.ADMIN_PASS || "meridian"
  return req.headers["x-admin-pass"] === expected
}

function present(entries, record) {
  const inviter = record.referredBy
    ? entries.find((item) => item.id === record.referredBy)
    : null
  const brought = entries
    .filter((item) => item.referredBy === record.id)
    .map((item) => ({ id: item.id, name: item.name, email: item.email }))
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    phone: record.phone,
    country: record.country,
    prizeName: record.prizeName,
    cash: Number(record.cash) || 0,
    createdAt: record.createdAt,
    bonusEntries: Number(record.bonusEntries) || 0,
    chances: 1 + (Number(record.bonusEntries) || 0),
    referredBy: record.referredBy,
    referrerName: inviter?.name || "",
    referrerEmail: inviter?.email || "",
    brought,
    status: standings.has(record.status) ? record.status : "received",
    deliveryUrl: record.deliveryUrl || "",
    letterSentAt: record.letterSentAt || "",
    letterSentTo: record.letterSentTo || "",
    letterError: record.letterError || "",
    noteSentAt: record.noteSentAt || "",
    noteSentTo: record.noteSentTo || "",
    noteLink: record.noteLink || "",
    noteError: record.noteError || "",
    adminNotice: record.adminNotice || "unconfigured",
  }
}

function claimsPayload() {
  const entries = listEntries()
  const claims = entries
    .map((record) => present(entries, record))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return { mail: mailStatus(), claims }
}

export async function handleAdmin(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1")
  const parts = url.pathname.split("/").filter(Boolean)

  if (req.method === "POST" && parts.length === 1 && parts[0] === "test-mail") {
    return handleTestMail(req, res)
  }

  if (!authorized(req)) return send(res, 401, { error: "The desk is locked." })

  if (req.method === "POST" && parts.length === 1 && parts[0] === "draw") {
    let body = {}
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: "Invalid request." })
    }
    const end = Number(body.end)
    if (!Number.isFinite(end)) return send(res, 400, { error: "Enter a date and a time." })
    writeDrawEnd(end)
    return send(res, 200, { end })
  }

  if (req.method === "GET" && parts.length === 1 && parts[0] === "claims") {
    return send(res, 200, claimsPayload())
  }

  if (req.method === "POST" && parts.length === 1 && parts[0] === "claims") {
    let body = {}
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: "Invalid request." })
    }
    const current = listEntries()
    const record = buildClaim(body, current)
    if (!record) return send(res, 400, { error: "Enter the name and email." })
    if (current.some((item) => item.id === record.id)) {
      return send(res, 409, { error: "That identification code is already on the desk." })
    }
    await updateEntries((entries) => {
      if (!entries.some((item) => item.id === record.id)) entries.push(record)
    })
    const saved = listEntries().find((item) => item.id === record.id)
    if (!saved) return send(res, 500, { error: "The claim was not stored. Try again." })
    return send(res, 201, { ...claimsPayload(), added: present(listEntries(), saved) })
  }

  if (parts[0] !== "claims" || !/^MD-[A-Z0-9]{6}$/.test(parts[1] || "")) {
    return send(res, 404, { error: "Not found" })
  }

  const id = parts[1]
  let body = {}
  if (req.method === "POST") {
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: "Invalid request." })
    }
  } else {
    return send(res, 405, { error: "Method not allowed." })
  }

  if (parts.length === 3 && parts[2] === "notify") {
    const record = listEntries().find((item) => item.id === id)
    if (!record) return send(res, 404, { error: "Not found" })
    const notice = await notifyAdmin(record)
    await updateEntries((entries) => {
      const item = entries.find((entry) => entry.id === id)
      if (item) item.adminNotice = notice
    })
    if (notice !== "sent") {
      const error = notice === "unconfigured"
        ? "Brevo is not configured on this server."
        : "The desk notice could not be sent."
      return send(res, notice === "unconfigured" ? 503 : 502, { error, ...claimsPayload() })
    }
    return send(res, 200, claimsPayload())
  }

  if (parts.length === 3 && parts[2] === "letter") {
    const link = deliveryLink(body.deliveryUrl)
    if (!link) return send(res, 400, { error: "Paste the logistics link. It must start with http:// or https://." })
    const current = listEntries().find((item) => item.id === id)
    if (!current) return send(res, 404, { error: "This claim is not on the desk. Refresh and try that person again." })
    if (current.status !== "selected") {
      return send(res, 409, { error: "Select this claim before sending the congratulations letter." })
    }
    const to = String(body.to || current.email || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return send(res, 400, { error: "Enter the email that should receive the letter." })
    }
    try {
      await sendSelection(current, link, to)
    } catch (error) {
      const message = error.message || "The letter could not be sent."
      await updateEntries((entries) => {
        const item = entries.find((entry) => entry.id === id)
        if (item) item.letterError = message
      })
      const status = error.status || 502
      return send(res, status, { error: message, ...claimsPayload() })
    }
    await updateEntries((entries) => {
      const item = entries.find((entry) => entry.id === id)
      if (!item) return
      item.deliveryUrl = link
      item.letterSentAt = new Date().toISOString()
      item.letterSentTo = to
      item.letterError = ""
      item.status = "selected"
    })
    return send(res, 200, claimsPayload())
  }

  if (parts.length === 3 && parts[2] === "note") {
    const current = listEntries().find((item) => item.id === id)
    if (!current) return send(res, 404, { error: "This claim is not on the desk. Refresh and try that person again." })
    const message = String(body.message || "").trim()
    if (message.length < 2) return send(res, 400, { error: "Write the message first." })
    if (message.length > 2000) return send(res, 400, { error: "Keep the message under 2,000 characters." })
    const to = String(body.to || current.email || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return send(res, 400, { error: "Enter the email that should receive the message." })
    }
    const includeLink = Boolean(body.includeLink)
    const link = includeLink ? deliveryLink(body.link) : ""
    if (includeLink && !link) {
      return send(res, 400, { error: "Paste the link, or turn the link off." })
    }
    try {
      await sendCustomerNote(current, message, link, to)
    } catch (error) {
      const failure = error.message || "The message could not be sent."
      await updateEntries((entries) => {
        const item = entries.find((entry) => entry.id === id)
        if (item) item.noteError = failure
      })
      return send(res, error.status || 502, { error: failure, ...claimsPayload() })
    }
    await updateEntries((entries) => {
      const item = entries.find((entry) => entry.id === id)
      if (!item) return
      item.noteSentAt = new Date().toISOString()
      item.noteSentTo = to
      item.noteLink = link
      item.noteError = ""
    })
    return send(res, 200, claimsPayload())
  }

  if (parts.length === 3 && parts[2] === "remove") {
    const removed = await updateEntries((entries) => {
      const index = entries.findIndex((item) => item.id === id)
      if (index < 0) return false
      entries.splice(index, 1)
      return true
    }, { allowShrink: true })
    if (!removed) return send(res, 404, { error: "This claim is not on the desk." })
    return send(res, 200, claimsPayload())
  }

  if (parts.length !== 2) return send(res, 404, { error: "Not found" })
  if (!standings.has(body.status)) return send(res, 400, { error: "Choose a standing." })
  const updated = await updateEntries((entries) => {
    const item = entries.find((entry) => entry.id === id)
    if (!item) return false
    item.status = body.status
    return true
  })
  if (!updated) return send(res, 404, { error: "Not found" })
  return send(res, 200, claimsPayload())
}

export function adminApi() {
  const middleware = (req, res, next) => {
    handleAdmin(req, res).catch(() => {
      if (!res.headersSent) send(res, 500, { error: "The desk could not complete that step." })
      else next()
    })
  }
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use("/api/admin", middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/admin", middleware)
    },
  }
}
