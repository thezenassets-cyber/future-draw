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

const side = "36px"
const redFill = `background-color:${red};background-image:linear-gradient(${red},${red});`

function button(href, label) {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td class="fd-btn" align="center" bgcolor="${red}" style="${redFill}">
        <a class="fd-btn" href="${safeHref}" style="display:block;padding:18px 24px;font-family:${ui};font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;color:${white};text-decoration:none;">${safeLabel}</a>
      </td>
    </tr>
  </table>`
}

function frame({ kicker, title, intro, blocks, action, note, banner }) {
  const body = [banner, intro, ...blocks, action, note].filter(Boolean).join("")
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <style>
      :root { color-scheme: light only; supported-color-schemes: light; }
      .fd-red { color: ${red} !important; }
      .fd-ink { color: ${ink} !important; }
      .fd-onred, .fd-onred a { color: ${white} !important; }
      .fd-bar, .fd-btn, .fd-btn a { background-color: ${red} !important; background-image: linear-gradient(${red},${red}) !important; }
      .fd-btn, .fd-btn a, .fd-onred { color: ${white} !important; }
    </style>
  </head>
  <body bgcolor="${white}" style="margin:0;padding:0;${paper}color:${ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">
      <tr>
        <td align="center" bgcolor="${white}" style="padding:24px 12px 32px;${paper}">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" bgcolor="${white}" style="width:100%;max-width:640px;${paper}">
            <tr>
              <td class="fd-bar fd-onred" bgcolor="${red}" style="padding:32px ${side} 28px;${redFill}">
                <div class="fd-onred" style="font-family:${display};font-size:32px;font-weight:700;letter-spacing:-0.03em;line-height:1;color:${white};">Future Draw</div>
                <div style="padding-top:12px;font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;line-height:1.4;">
                  <a class="fd-onred" href="${site}" style="color:${white};text-decoration:none;">futuredraw.live</a>
                </div>
              </td>
            </tr>
            <tr>
              <td class="fd-red" bgcolor="${white}" style="padding:32px ${side} 0;font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${red};${paper}">${kicker}</td>
            </tr>
            <tr>
              <td class="fd-ink" bgcolor="${white}" style="padding:10px ${side} 0;font-family:${display};font-size:44px;font-weight:700;letter-spacing:-0.03em;line-height:0.98;color:${ink};${paper}">${title}</td>
            </tr>
            ${body}
            <tr>
              <td bgcolor="${white}" style="padding:32px ${side} 8px;${paper}">
                <div style="border-top:4px solid ${red};padding-top:16px;font-family:${ui};font-size:14px;line-height:1.6;color:${ink};">
                  Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.
                  <a class="fd-red" href="${site}" style="color:${red};text-decoration:none;">futuredraw.live</a>
                </div>
              </td>
            </tr>
            <tr><td class="fd-bar" bgcolor="${red}" height="16" style="${redFill}font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function paragraph(html) {
  return `<tr><td class="fd-ink" bgcolor="${white}" style="padding:18px ${side} 0;font-family:${ui};font-size:17px;line-height:1.6;color:${ink};${paper}">${html}</td></tr>`
}

function band(html) {
  return `<tr>
    <td bgcolor="${white}" style="padding:22px ${side} 0;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="border-left:8px solid ${red};${paper}">
        <tr>
          <td class="fd-ink" bgcolor="${white}" style="padding:4px 0 4px 16px;font-family:${ui};font-size:15px;line-height:1.5;color:${ink};${paper}">${html}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

function deliverySteps(codeHtml) {
  const steps = [
    ["Open the delivery company", "Use the button below. It opens the company that sends the package to the address you give them."],
    ["Give them your code", `When their customer care answers, give them your identification code, ${codeHtml}. That code is how they find this claim.`],
    ["Give them your address", "Tell them the full address where you want the package delivered. They send it to the address you provide."],
    ["Stay in touch until it arrives", "Remain in contact with the delivery company and track the package until it is in your hands. If they ask again, repeat the same code and the same address."],
  ]
  const rows = steps.map(([heading, body], index) => `<tr>
      <td bgcolor="${white}" style="padding:14px ${side} 0;${paper}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">
          <tr>
            <td class="fd-bar fd-onred" valign="top" align="center" width="48" bgcolor="${red}" style="width:48px;${redFill}padding:12px 0;font-family:${display};font-size:22px;font-weight:700;line-height:1;color:${white};">${index + 1}</td>
            <td class="fd-ink" valign="top" bgcolor="${white}" style="padding:0 0 0 16px;${paper}">
              <div style="font-family:${display};font-size:20px;font-weight:700;letter-spacing:-0.03em;line-height:1.15;color:${ink};">${heading}</div>
              <div style="padding-top:6px;font-family:${ui};font-size:16px;line-height:1.55;color:${ink};">${body}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("")
  return rows
}

function amountBlock(amount, caption) {
  return `<tr>
    <td bgcolor="${white}" style="padding:28px ${side} 0;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="border-top:8px solid ${red};${paper}">
        <tr>
          <td bgcolor="${white}" style="padding:18px 0 0;${paper}">
            <div class="fd-red" style="font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${red};">Amount to claim</div>
            <div class="fd-red" style="padding-top:8px;font-family:${display};font-size:44px;font-weight:700;letter-spacing:-0.03em;line-height:1;color:${red};">${escapeHtml(formatMoney(amount))}</div>
            <div class="fd-ink" style="padding-top:12px;font-family:${ui};font-size:17px;line-height:1.4;color:${ink};">${escapeHtml(caption)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function prizeSheet(car, cash) {
  return `<tr>
    <td bgcolor="${white}" style="padding:28px 0 0;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${red}" style="${redFill}">
        <tr>
          <td class="fd-onred" bgcolor="${red}" style="padding:28px ${side} 0;${redFill}font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${white};">Selected car</td>
        </tr>
        <tr>
          <td class="fd-onred" bgcolor="${red}" style="padding:8px ${side} 22px;${redFill}font-family:${display};font-size:36px;font-weight:700;letter-spacing:-0.03em;line-height:1.05;color:${white};">${escapeHtml(car)}</td>
        </tr>
        <tr>
          <td bgcolor="${red}" style="padding:0 ${side};${redFill}"><div style="border-top:2px solid ${white};font-size:0;line-height:0;">&nbsp;</div></td>
        </tr>
        <tr>
          <td class="fd-onred" bgcolor="${red}" style="padding:20px ${side} 0;${redFill}font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${white};">Cash prize</td>
        </tr>
        <tr>
          <td class="fd-onred" bgcolor="${red}" style="padding:8px ${side} 28px;${redFill}font-family:${display};font-size:48px;font-weight:700;letter-spacing:-0.03em;line-height:1;color:${white};">${escapeHtml(cash)}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

function codeSheet(code) {
  const safe = escapeHtml(code)
  return `<tr>
    <td bgcolor="${white}" style="padding:20px ${side} 0;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="border:4px solid ${red};${paper}">
        <tr>
          <td class="fd-red" bgcolor="${white}" style="padding:22px 24px 0;font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${red};${paper}">Identification code</td>
        </tr>
        <tr>
          <td class="fd-red" bgcolor="${white}" style="padding:8px 24px 0;font-family:${display};font-size:40px;font-weight:700;letter-spacing:0.04em;line-height:1;color:${red};${paper}">${safe}</td>
        </tr>
        <tr>
          <td class="fd-ink" bgcolor="${white}" style="padding:12px 24px 22px;font-family:${ui};font-size:16px;line-height:1.55;color:${ink};${paper}">Give this code to the delivery company. It is how they find your claim. Keep it until the package is in your hands.</td>
        </tr>
      </table>
    </td>
  </tr>`
}

function detailBlock(rows) {
  const lines = rows
    .map(([label, value]) => `<tr>
      <td bgcolor="${white}" style="padding:16px 0 0;border-top:4px solid ${red};font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${red};${paper}">${escapeHtml(label)}</td>
    </tr>
    <tr>
      <td class="fd-ink" bgcolor="${white}" style="padding:6px 0 16px;font-family:${display};font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;color:${ink};${paper}">${escapeHtml(value)}</td>
    </tr>`)
    .join("")
  return `<tr>
    <td bgcolor="${white}" style="padding:28px ${side} 0;${paper}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${white}" style="${paper}">${lines}</table>
    </td>
  </tr>`
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
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
}

function fromDomain() {
  const match = String(process.env.MAIL_FROM || "").match(/@([a-z0-9.-]+\.[a-z]{2,})/i)
  return match ? match[1].toLowerCase() : ""
}

function retryable(error) {
  return ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ECONNRESET", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(String(error?.code || error?.cause?.code || ""))
}

async function resend(path, options = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: options.body,
    signal: AbortSignal.timeout(20000),
  })
  const text = await response.text()
  let payload = {}
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { message: text.slice(0, 180) }
    }
  }
  return { status: response.status, payload }
}

function resendError(payload, status) {
  const raw = payload?.message || payload?.error || "Resend did not accept that letter."
  const error = new Error(Array.isArray(raw) ? raw.join(" ") : String(raw))
  error.status = status === 401 || status === 403 ? 503 : 502
  return error
}

export async function sendMail({ to, subject, text, html }) {
  if (!configured()) {
    const error = new Error("Resend is not configured on this server.")
    error.status = 503
    throw error
  }
  const body = JSON.stringify({
    from: process.env.MAIL_FROM,
    to: [String(to).trim()],
    reply_to: adminInbox(),
    subject,
    text,
    html,
  })
  let last
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { status, payload } = await resend("/emails", { method: "POST", body })
      if (status >= 200 && status < 300 && payload?.id) {
        return { messageId: String(payload.id), response: "accepted" }
      }
      last = resendError(payload, status)
      if (status !== 429 && status < 500) break
    } catch (error) {
      last = error
      const temporary = retryable(error) || error instanceof TypeError || error?.name === "TimeoutError" || error?.name === "AbortError"
      if (!temporary) break
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  if (last?.status) throw last
  const wrapped = new Error(last?.message || "The letter could not be sent.")
  wrapped.status = 502
  throw wrapped
}

export function adminInbox() {
  return String(process.env.ADMIN_EMAIL || "thefuturedraw@gmail.com").trim()
}

export function mailStatus() {
  return {
    configured: configured(),
    from: process.env.MAIL_FROM || "",
    adminTo: adminInbox(),
    letter: "congrats-prize",
    delivery: "resend-accepted",
    selection: "one-minute",
  }
}

let relayResult = null
let relayCheckedAt = 0

export async function mailCheck() {
  const status = mailStatus()
  if (!status.configured) {
    return { ...status, accepted: false, error: "Resend is not configured on this server." }
  }
  if (relayResult && Date.now() - relayCheckedAt < 120000) {
    return { ...status, ...relayResult }
  }
  try {
    const domain = fromDomain()
    const { status: code, payload } = await resend("/domains")
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
    const match = list.find((item) => String(item?.name || "").toLowerCase() === domain)
    if (code === 401 || code === 403) {
      relayResult = { accepted: false, error: "Resend did not accept the API key." }
    } else if (code < 200 || code >= 300) {
      relayResult = { accepted: false, error: publicMailError(resendError(payload, code)) }
    } else if (!match) {
      relayResult = { accepted: false, error: `Resend does not have ${domain || "the sending domain"}.` }
    } else if (String(match.status || "").toLowerCase() !== "verified") {
      relayResult = { accepted: false, error: `Resend has not verified ${domain} yet.` }
    } else {
      relayResult = { accepted: true, error: "" }
    }
  } catch (error) {
    relayResult = { accepted: false, error: publicMailError(error) }
  }
  relayCheckedAt = Date.now()
  return { ...status, ...relayResult }
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
  const link = inviteFor(record.id)
  const safeLink = escapeHtml(link)
  const subject = `You're entered · ${record.id}`
  const text = [
    "You're entered.",
    "",
    `Identification: ${record.id}`,
    `This letter records your entry. It is not a selection. This code is your identification for the ${record.prizeName} and ${formatMoney(record.cash)}. You have ${chances}. One finished invite adds one chance. Keep this code. The desk emails you again within a minute. Check the inbox and the spam folder.`,
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
      paragraph(`This letter records your entry. It is not a selection. This code is your identification for the ${escapeHtml(record.prizeName)} and ${escapeHtml(formatMoney(record.cash))}. You have ${escapeHtml(chances)}. One finished invite adds one chance. Keep this code. The desk emails you again within a minute. Check the inbox and the spam folder.`),
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

export function publicMailError(error) {
  return String(error?.message || "The email could not be sent.")
    .replace(/\b(pass(?:word)?|key|secret)\s*[:=]\s*\S+/gi, "$1=[hidden]")
    .slice(0, 180)
}

export async function notifyClaimant(record) {
  if (!configured() || !record?.email) {
    return { status: "unconfigured", error: "Resend is not configured on this server." }
  }
  try {
    const message = claimSuccess(record)
    await sendMail({ to: record.email, subject: message.subject, text: message.text, html: message.html })
    return { status: "sent", error: "" }
  } catch (error) {
    return { status: "failed", error: publicMailError(error) }
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
    "The congratulations letter sends about one minute after this registration, unless the claim is set to Under consideration or Closed. The claim stays until the desk removes it.",
    `Review it at ${desk}.`,
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.",
  ].join("\n")
  const html = frame({
    kicker: "Desk notice",
    title: "New claim",
    intro: paragraph("A claim has been registered. The congratulations letter sends about one minute from now, unless you set the claim to Under consideration or Closed. The claim stays until you remove it."),
    blocks: [
      detailBlock(rows),
    ],
    action: paragraph(button(desk, "Open the desk")),
  })
  return { subject, text, html }
}

export function selectionLetter(record, link, options = {}) {
  const safeLink = escapeHtml(link)
  const code = escapeHtml(record.id)
  const car = record.prizeName || "Prize"
  const cash = formatMoney(record.cash)
  const name = record.name || "there"
  const subject = `Congratulations · ${car} · ${record.id}`
  const text = [
    options.sample ? `Desk sample${options.reference ? ` ${options.reference}` : ""}. This is not a selection.` : "",
    `Hello ${name},`,
    "",
    "Congratulations. The Future Draw desk has selected your claim. Your car and your cash prize are confirmed in this letter. Keep it. The identification code is what you give the delivery company.",
    "",
    `Selected car: ${car}`,
    `Cash prize: ${cash}`,
    `Identification code: ${record.id}`,
    "",
    "Give this code to the delivery company. It is how they find your claim. Keep it until the package is in your hands.",
    "",
    "Receiving the package",
    "",
    "The package is sent by the delivery company. There are four steps, and they are the only steps.",
    "",
    "1. Open the delivery link. It opens the company that sends the package to the address you give them.",
    `2. When their customer care answers, give them your identification code, ${record.id}. That code is how they find this claim.`,
    "3. Tell them the full address where you want the package delivered. They send it to the address you provide.",
    "4. Remain in contact with the delivery company and track the package until it is in your hands. If they ask again, repeat the same code and the same address.",
    "",
    `Delivery: ${link}`,
    "",
    "No fee is required. Stay in touch with the delivery company until the package reaches the address you give them.",
    "",
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc.",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n")
  const html = frame({
    kicker: "Selected claim",
    title: "Congratulations.",
    banner: options.sample ? band(`Desk sample${options.reference ? ` · ${escapeHtml(options.reference)}` : ""}. This letter shows the selection letter. It is not a selection.`) : "",
    intro: paragraph(`Hello ${escapeHtml(name)}. The Future Draw desk has selected your claim. Your car and your cash prize are confirmed below. Keep this letter. The identification code is what you give the delivery company when you arrange the package.`),
    blocks: [
      prizeSheet(car, cash),
      codeSheet(record.id),
      paragraph(`<span class="fd-red" style="font-family:${ui};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${red};">Receiving the package</span>`),
      paragraph("The package is sent by the delivery company. There are four steps, and they are the only steps."),
      deliverySteps(`<strong class="fd-red" style="color:${red};">${code}</strong>`),
    ],
    action: paragraph(`${button(link, "Open the delivery company")}<div style="padding-top:14px;font-family:${ui};font-size:15px;line-height:1.5;"><a class="fd-red" href="${safeLink}" style="color:${red};word-break:break-all;">${safeLink}</a></div>`),
    note: paragraph("No fee is required. Stay in touch with the delivery company, and track the package, until it reaches the address you give them."),
  })
  return { subject, text, html }
}

export async function notifyAdmin(record) {
  if (!configured() || !adminInbox()) {
    return { status: "unconfigured", error: "Resend is not configured on this server." }
  }
  try {
    const message = claimNotice(record)
    await sendMail({ to: adminInbox(), subject: message.subject, text: message.text, html: message.html })
    return { status: "sent", error: "" }
  } catch (error) {
    return { status: "failed", error: publicMailError(error) }
  }
}

export async function sendSelection(record, link, to = record.email) {
  const message = selectionLetter(record, link)
  await sendMail({ to, subject: message.subject, text: message.text, html: message.html })
}

export function customerNote(record, message, link = "") {
  const safeName = escapeHtml(record.name || "there")
  const blocks = String(message || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => paragraph(escapeHtml(part).replaceAll("\n", "<br>")))
  const subject = `A note from Future Draw · ${record.id}`
  const text = [
    `Hello ${record.name || "there"},`,
    "",
    String(message || "").trim(),
    "",
    link ? `Open this link: ${link}` : "",
    "",
    `Identification: ${record.id}`,
    "Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required.",
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n")
  const html = frame({
    kicker: "From the desk",
    title: "A note for you",
    intro: paragraph(`Hello ${safeName},`),
    blocks,
    action: link
      ? paragraph(`${button(link, "Open the link")}<div style="padding-top:12px;font-size:14px;line-height:1.4;"><a class="fd-red" href="${escapeHtml(link)}" style="color:${red};">${escapeHtml(link)}</a></div>`)
      : "",
    note: paragraph(`Identification <strong class="fd-red" style="color:${red};">${escapeHtml(record.id)}</strong>`),
  })
  return { subject, text, html }
}

export async function sendCustomerNote(record, message, link, to = record.email) {
  const note = customerNote(record, message, link)
  await sendMail({ to, subject: note.subject, text: note.text, html: note.html })
}

function letter(to) {
  return selectionLetter({
    id: "MD-SAMPLE",
    name: "there",
    email: to,
    prizeName: "Roadster",
    cash: 500000,
  }, site, { sample: true, reference: new Date().toISOString().slice(0, 16) })
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
    return send(res, 200, { sent: true, id: sent.messageId || "", subject: message.subject, response: sent.response || "" })
  } catch (error) {
    const status = error.status || 502
    return send(res, status, { error: publicMailError(error) })
  }
}
