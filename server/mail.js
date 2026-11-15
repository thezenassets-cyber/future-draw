import nodemailer from "nodemailer"
import { readDrawEnd } from "./clock.js"

const site = "https://futuredraw.live"
const desk = `${site}/admin`

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

const red = "#e10600"
const ink = "#1a1212"
const white = "#fffffe"
const display = "Syne, Arial Narrow, sans-serif"
const ui = "Geist, Segoe UI, Arial, sans-serif"
const paper = `background-color:${white};background-image:linear-gradient(${white},${white});`

export function formatMoney(amount) {
  const value = Number(amount)
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe)
}

function button(href, label) {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td class="fd-btn" bgcolor="${red}" style="background-color:${red};background-image:linear-gradient(${red},${red});border-radius:2px;">
        <a class="fd-btn" href="${safeHref}" style="display:inline-block;padding:16px 28px;font-family:${ui};font-size:16px;font-weight:600;line-height:1;color:${white};text-decoration:none;">${safeLabel}</a>
      </td>
    </tr>
  </table>`
}

function frame({ kicker, title, intro, blocks, action, note }) {
  const body = [intro, ...blocks, action, note].filter(Boolean).join("")
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <style>
      :root { color-scheme: light only; supported-color-schemes: light; }
      .fd-red { color: ${red} !important; }
      .fd-ink { color: ${ink} !important; }
      .fd-bar, .fd-btn, .fd-btn a { background-color: ${red} !important; background-image: linear-gradient(${red},${red}) !important; }
      .fd-btn, .fd-btn a { color: ${white} !important; }
    </style>
  </head>
  <body bgcolor="${white}" style="margin:0;padding:0;${paper}color:${ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">
      <tr><td class="fd-bar" bgcolor="${red}" height="8" style="background-color:${red};background-image:linear-gradient(${red},${red});font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td align="center" bgcolor="${white}" style="padding:36px 20px 40px;${paper}">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="${white}" style="width:100%;max-width:560px;${paper}">
            <tr>
              <td class="fd-ink" bgcolor="${white}" style="font-family:${display};font-size:22px;font-weight:700;line-height:1;color:${ink};${paper}">Future <span class="fd-red" style="color:${red};">Draw</span></td>
            </tr>
            <tr>
              <td bgcolor="${white}" style="padding-top:10px;font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;${paper}">
                <a class="fd-red" href="${site}" style="color:${red};text-decoration:none;">futuredraw.live</a>
              </td>
            </tr>
            <tr>
              <td class="fd-red" bgcolor="${white}" style="padding-top:32px;font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};${paper}">${kicker}</td>
            </tr>
            <tr>
              <td class="fd-ink" bgcolor="${white}" style="padding-top:10px;font-family:${display};font-size:36px;font-weight:700;line-height:1.05;color:${ink};${paper}">${title}</td>
            </tr>
            ${body}
            <tr>
              <td class="fd-ink" bgcolor="${white}" style="padding-top:32px;border-top:2px solid ${red};font-family:${ui};font-size:13px;line-height:1.5;color:${ink};${paper}">
                Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.
                <a class="fd-red" href="${site}" style="color:${red};text-decoration:none;">futuredraw.live</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td class="fd-bar" bgcolor="${red}" height="8" style="background-color:${red};background-image:linear-gradient(${red},${red});font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </body>
</html>`
}

function paragraph(html) {
  return `<tr><td class="fd-ink" bgcolor="${white}" style="padding-top:16px;font-family:${ui};font-size:16px;line-height:1.5;color:${ink};${paper}">${html}</td></tr>`
}

function amountBlock(amount, caption) {
  return `<tr>
    <td bgcolor="${white}" style="padding-top:28px;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">
        <tr>
          <td bgcolor="${white}" style="padding:24px 0 8px;${paper}">
            <div class="fd-red" style="font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">Amount to claim</div>
            <div class="fd-red" style="padding-top:8px;font-family:${display};font-size:40px;font-weight:700;line-height:1;color:${red};">${escapeHtml(formatMoney(amount))}</div>
            <div class="fd-ink" style="padding-top:10px;font-family:${ui};font-size:16px;line-height:1.4;color:${ink};">${escapeHtml(caption)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function detailBlock(rows) {
  const lines = rows
    .map(([label, value]) => `<tr>
      <td bgcolor="${white}" style="padding:14px 0 0;border-top:2px solid ${red};font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};${paper}">${escapeHtml(label)}</td>
    </tr>
    <tr>
      <td class="fd-ink" bgcolor="${white}" style="padding:4px 0 14px;font-family:${ui};font-size:18px;line-height:1.4;color:${ink};${paper}">${escapeHtml(value)}</td>
    </tr>`)
    .join("")
  return `<tr>
    <td bgcolor="${white}" style="padding-top:28px;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">${lines}</table>
    </td>
  </tr>`
}

function drawWhen() {
  const end = readDrawEnd()
  const date = new Date(end ?? Date.parse("2026-12-20T18:00:00"))
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  const hours24 = date.getHours()
  const suffix = hours24 >= 12 ? "p.m" : "a.m"
  const hours = hours24 % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${day} at ${hours}:${minutes} ${suffix}`
}

function chanceLabel(record) {
  const count = 1 + (Number(record.bonusEntries) || 0)
  return count === 1 ? "1 chance" : `${count} chances`
}

function inviteFor(id) {
  return `${site}/?ref=${encodeURIComponent(id)}`
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

function send(res, status, body) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

function configured() {
  return Boolean(process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_KEY && process.env.MAIL_FROM)
}

export async function sendMail({ to, subject, text, html }) {
  if (!configured()) {
    const error = new Error("Brevo is not configured on this server.")
    error.status = 503
    throw error
  }
  const transport = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })
  const replyTo = String(process.env.ADMIN_EMAIL || "thefuturedraw@gmail.com").trim()
  const message = {
    from: process.env.MAIL_FROM,
    replyTo,
    to,
    subject,
    text,
    html,
    headers: {
      "X-Mailin-Track": "0",
    },
  }
  let last
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await transport.sendMail(message)
    } catch (error) {
      last = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  const wrapped = new Error(last?.message || "The letter could not be sent.")
  wrapped.status = 502
  throw wrapped
}

export function adminInbox() {
  return String(process.env.ADMIN_EMAIL || process.env.MAIL_FROM || "").trim()
}

export function mailStatus() {
  return {
    configured: configured(),
    from: process.env.MAIL_FROM || "",
    adminTo: adminInbox(),
  }
}

export function deliveryLink(value) {
  let raw = String(value || "").trim()
  if (!raw) return ""
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:" && url.protocol !== "http:") return ""
    return url.toString()
  } catch {
    return ""
  }
}

export function claimSuccess(record) {
  const phone = record.phone || "None"
  const chances = chanceLabel(record)
  const when = drawWhen()
  const link = inviteFor(record.id)
  const safeLink = escapeHtml(link)
  const subject = `You're entered · ${record.id}`
  const text = [
    "You're entered.",
    "",
    `Identification: ${record.id}`,
    `This code is your identification for the ${record.prizeName} and ${formatMoney(record.cash)}. You have ${chances}. One finished invite adds one chance. It is not a winning notice. The draw is on ${when}.`,
    "",
    `Name: ${record.name}`,
    `Email: ${record.email}`,
    `Phone: ${phone}`,
    `Country: ${record.country}`,
    `Prize: ${record.prizeName}`,
    `Amount to claim: ${formatMoney(record.cash)}`,
    "",
    "Give someone a chance.",
    "Send this link to someone you love. When they finish their own free entry, you receive one extra chance.",
    link,
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.",
  ].join("\n")
  const html = frame({
    kicker: "Identification",
    title: "You're entered.",
    intro: paragraph(`<strong class="fd-red" style="font-family:${display};font-size:40px;line-height:1;color:${red};">${escapeHtml(record.id)}</strong>`),
    blocks: [
      amountBlock(record.cash, record.prizeName || "Prize"),
      paragraph(`This code is your identification for the ${escapeHtml(record.prizeName)} and ${escapeHtml(formatMoney(record.cash))}. You have ${escapeHtml(chances)}. One finished invite adds one chance. It is not a winning notice. The draw is on ${escapeHtml(when)}.`),
      detailBlock([
        ["Name", record.name],
        ["Email", record.email],
        ["Phone", phone],
        ["Country", record.country || "None"],
        ["Prize", record.prizeName || "Prize"],
        ["Chances", chances],
      ]),
      paragraph(`<span class="fd-red" style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">Give someone a chance</span>`),
      paragraph("Send this link to someone you love. When they finish their own free entry, you receive one extra chance."),
    ],
    action: paragraph(`${button(link, "Open your invite")}<div style="padding-top:12px;font-size:14px;line-height:1.4;"><a class="fd-red" href="${safeLink}" style="color:${red};">${safeLink}</a></div>`),
  })
  return { subject, text, html }
}

export async function notifyClaimant(record) {
  if (!configured() || !record?.email) return "unconfigured"
  try {
    const message = claimSuccess(record)
    await sendMail({ to: record.email, subject: message.subject, text: message.text, html: message.html })
    return "sent"
  } catch {
    return "failed"
  }
}

function formatWhen(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function claimNotice(record) {
  const referred = record.referredBy || "Direct entry"
  const phone = record.phone || "None"
  const country = record.country || "None"
  const chances = chanceLabel(record)
  const registered = formatWhen(record.createdAt) || "Just now"
  const rows = [
    ["Identification", record.id],
    ["Name", record.name],
    ["Email", record.email],
    ["Phone", phone],
    ["Country", country],
    ["Prize", record.prizeName || "Prize"],
    ["Amount", formatMoney(record.cash)],
    ["Chances", chances],
    ["Registered", registered],
    ["Referred by", referred],
    ["Brought in", "Nobody yet"],
  ]
  const subject = `Future Draw claim ${record.id} registered`
  const text = [
    "A claim has been registered.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "This registration is not a selection.",
    `Review it at ${desk}.`,
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.",
  ].join("\n")
  const html = frame({
    kicker: "Desk notice",
    title: "New claim",
    intro: paragraph("A claim has been registered. This registration is not a selection."),
    blocks: [
      detailBlock(rows),
    ],
    action: paragraph(button(desk, "Open the desk")),
  })
  return { subject, text, html }
}

export function selectionLetter(record, link) {
  const safeLink = escapeHtml(link)
  const subject = `Future Draw selection ${record.id}`
  const text = [
    "Congratulations.",
    "",
    "The Future Draw desk has selected your claim.",
    "",
    `Identification: ${record.id}`,
    `Email: ${record.email}`,
    `Name: ${record.name}`,
    `Prize: ${record.prizeName}`,
    `Amount to claim: ${formatMoney(record.cash)}`,
    "",
    `Delivery: ${link}`,
    "",
    "Open that link. It goes straight to the logistics company so the prize can be delivered to your address, worldwide.",
    "",
    `Phone: ${record.phone || "None"}`,
    `Country: ${record.country || "None"}`,
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required. This letter is from the Future Draw desk.",
  ].join("\n")
  const html = frame({
    kicker: "Selection",
    title: "Congratulations",
    intro: paragraph("The Future Draw desk has selected your claim."),
    blocks: [
      amountBlock(record.cash, record.prizeName || "Prize"),
      paragraph(`Identification <strong class="fd-red" style="color:${red};">${escapeHtml(record.id)}</strong>`),
      paragraph(`${escapeHtml(record.name)} · ${escapeHtml(record.email)} · ${escapeHtml(record.phone || "None")} · ${escapeHtml(record.country || "None")}`),
      paragraph(`<span class="fd-red" style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">Delivery</span>`),
      paragraph("Open the button. It goes straight to the logistics company so the prize can be delivered to your address, worldwide."),
    ],
    action: paragraph(`${button(link, "Open delivery")}<div style="padding-top:12px;font-size:14px;line-height:1.4;"><a class="fd-red" href="${safeLink}" style="color:${red};">${safeLink}</a></div>`),
  })
  return { subject, text, html }
}

export async function notifyAdmin(record) {
  if (!configured() || !adminInbox()) return "unconfigured"
  try {
    const message = claimNotice(record)
    await sendMail({ to: adminInbox(), subject: message.subject, text: message.text, html: message.html })
    return "sent"
  } catch {
    return "failed"
  }
}

export async function sendSelection(record, link) {
  const message = selectionLetter(record, link)
  await sendMail({ to: record.email, subject: message.subject, text: message.text, html: message.html })
}

function letter(to) {
  const subject = "Future Draw desk test"
  const text = [
    "This is a test letter from the Future Draw desk.",
    "",
    `The draw is at ${site}.`,
    "An entry confirmation is not a notice that you have won.",
    "A finished invite adds one extra chance for the person who shared the link. The family member is entered on their own.",
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc.",
    "No fee is required to enter.",
  ].join("\n")
  const html = frame({
    kicker: "Desk test",
    title: "Mail check",
    intro: paragraph(`This letter confirms that mail from the desk can reach ${escapeHtml(to)}.`),
    blocks: [
      paragraph(`The draw is at <a href="${site}" style="color:${red};">${site}</a>. An entry confirmation is not a notice that you have won.`),
      paragraph("A finished invite adds one extra chance for the person who shared the link. The family member is entered on their own."),
    ],
    action: paragraph(button(site, "Open Future Draw")),
  })
  return { subject, text, html }
}

export async function handleTestMail(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." })
  const expected = process.env.ADMIN_PASS || "meridian"
  if (req.headers["x-admin-pass"] !== expected) return send(res, 401, { error: "The desk is locked." })
  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: "Invalid request." })
  }
  const to = String(body.to || "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return send(res, 400, { error: "Enter a valid email." })
  const message = letter(to)
  try {
    const sent = await sendMail({ to, subject: message.subject, text: message.text, html: message.html })
    return send(res, 200, { sent: true, id: sent.messageId || "" })
  } catch (error) {
    const status = error.status || 502
    return send(res, status, { error: error.message || "The letter could not be sent." })
  }
}
