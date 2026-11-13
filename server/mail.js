import nodemailer from "nodemailer"

const site = "https://futuredraw.live"

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
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })
  return transport.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  })
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
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;color:#141414;font-family:Georgia,serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr><td style="border-top:2px solid #e10600;padding-top:24px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">Future Draw</td></tr>
            <tr><td style="padding-top:16px;font-size:28px;line-height:1.2;">Desk test</td></tr>
            <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">This letter confirms that mail from the desk can reach ${to}.</td></tr>
            <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">The draw is at <a href="${site}" style="color:#e10600;">${site}</a>. An entry confirmation is not a notice that you have won.</td></tr>
            <tr><td style="padding-top:16px;font-size:16px;line-height:1.5;">A finished invite adds one extra chance for the person who shared the link. The family member is entered on their own.</td></tr>
            <tr><td style="padding-top:28px;font-size:13px;line-height:1.5;color:#4a4a4a;">Future Draw is a customer promotion. It is not affiliated with Tesla, Inc. No fee is required to enter.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
