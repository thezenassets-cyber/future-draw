import nodemailer from "nodemailer"

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
const muted = "#6e6464"
const line = "#e7e1e1"
const white = "#ffffff"
const display = "Syne, Arial Narrow, sans-serif"
const ui = "Geist, Segoe UI, Arial, sans-serif"

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
      <td bgcolor="${red}" style="background:${red};">
        <a href="${safeHref}" style="display:inline-block;padding:16px 28px;font-family:${ui};font-size:16px;font-weight:600;line-height:1;color:${white};text-decoration:none;">${safeLabel}</a>
      </td>
    </tr>
  </table>`
}

function frame({ kicker, title, intro, blocks, action, note }) {
  const body = [intro, ...blocks, action, note].filter(Boolean).join("")
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${white};color:${ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="background:${white};">
      <tr><td bgcolor="${red}" height="8" style="background:${red};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td align="center" style="padding:36px 20px 40px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
            <tr>
              <td style="font-family:${display};font-size:22px;font-weight:700;line-height:1;color:${ink};">Future <span style="color:${red};">Draw</span></td>
            </tr>
            <tr>
              <td style="padding-top:10px;font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">
                <a href="${site}" style="color:${red};text-decoration:none;">futuredraw.live</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">${kicker}</td>
            </tr>
            <tr>
              <td style="padding-top:10px;font-family:${display};font-size:36px;font-weight:700;line-height:1.05;color:${ink};">${title}</td>
            </tr>
            ${body}
            <tr>
              <td style="padding-top:32px;border-top:1px solid ${line};font-family:${ui};font-size:13px;line-height:1.5;color:${muted};">
                Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.
                <a href="${site}" style="color:${red};text-decoration:none;">futuredraw.live</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td bgcolor="${red}" height="8" style="background:${red};font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </body>
</html>`
}

function paragraph(html) {
  return `<tr><td style="padding-top:16px;font-family:${ui};font-size:16px;line-height:1.5;color:${ink};">${html}</td></tr>`
}

function amountBlock(amount, caption) {
  return `<tr>
    <td style="padding-top:28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="background:${white};border:1px solid ${line};border-top:4px solid ${red};">
        <tr>
          <td style="padding:24px 24px 22px;">
            <div style="font-family:${ui};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${red};">Amount to claim</div>
            <div style="padding-top:8px;font-family:${display};font-size:40px;font-weight:700;line-height:1;color:${red};">${escapeHtml(formatMoney(amount))}</div>
            <div style="padding-top:10px;font-family:${ui};font-size:16px;line-height:1.4;color:${muted};">${escapeHtml(caption)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
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
    socketTimeout: 15000,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })
  const replyTo = String(process.env.ADMIN_EMAIL || "thefuturedraw@gmail.com").trim()
  return transport.sendMail({
    from: process.env.MAIL_FROM,
    replyTo,
    to,
    subject,
    text,
    html,
  })
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

function claimNotice(record) {
  const referred = record.referredBy || "None"
  const subject = `Future Draw claim ${record.id} registered`
  const text = [
    "A claim has been registered.",
    "",
    `Identification: ${record.id}`,
    `Email: ${record.email}`,
    `Name: ${record.name}`,
    `Phone: ${record.phone}`,
    `Country: ${record.country}`,
    `Prize: ${record.prizeName}`,
    `Amount to claim: ${formatMoney(record.cash)}`,
    `Referred by: ${referred}`,
    "",
    "This registration is not a selection.",
    `Review it at ${desk}.`,
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.",
  ].join("\n")
  const html = frame({
    kicker: "Desk notice",
    title: "New claim",
    intro: paragraph(`Identification <strong style="color:${red};">${escapeHtml(record.id)}</strong>`),
    blocks: [
      amountBlock(record.cash, record.prizeName || "Prize"),
      paragraph(`${escapeHtml(record.name)} · ${escapeHtml(record.email)} · ${escapeHtml(record.country)}`),
      paragraph(`Phone ${escapeHtml(record.phone || "None")} · Referred by ${escapeHtml(referred)}`),
      paragraph("This registration is not a selection."),
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
    `Link: ${link}`,
    "",
    "The link above is the delivery path chosen by the desk for that prize.",
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required. This letter is from the Future Draw desk.",
  ].join("\n")
  const html = frame({
    kicker: "Selection",
    title: "Congratulations",
    intro: paragraph("The Future Draw desk has selected your claim."),
    blocks: [
      amountBlock(record.cash, record.prizeName || "Prize"),
      paragraph(`Identification <strong style="color:${red};">${escapeHtml(record.id)}</strong>`),
      paragraph(`${escapeHtml(record.name)} · ${escapeHtml(record.email)}`),
    ],
    action: paragraph(`${button(link, "Open your link")}<div style="padding-top:12px;font-size:14px;line-height:1.4;"><a href="${safeLink}" style="color:${red};">${safeLink}</a></div>`),
    note: paragraph("That link is the one the desk pasted for this claim."),
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
