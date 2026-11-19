import { sendMail } from "./mail.js"

const to = process.env.MAIL_TO || process.env.MAIL_FROM
if (!to) {
  console.error("Set RESEND_API_KEY, MAIL_FROM, and MAIL_TO.")
  process.exit(1)
}

const info = await sendMail({
  to,
  subject: "Future Draw mail check",
  text: "This is a test from Future Draw. It is not a winning notice.",
  html: "<p>This is a test from Future Draw. It is not a winning notice.</p>",
})

console.log(info.messageId || "sent")
