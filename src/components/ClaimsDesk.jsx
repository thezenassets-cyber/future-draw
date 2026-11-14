import { useEffect, useState } from "react"
import { formatCash } from "../prizes.js"

const standings = [
  ["received", "Received"],
  ["review", "Under consideration"],
  ["selected", "Selected"],
  ["closed", "Closed"],
]

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

function queueLabel(claims) {
  const ready = claims.filter((claim) => claim.status === "selected" && !claim.letterSentAt).length
  const people = claims.length === 1 ? "1 claim" : `${claims.length} claims`
  const waiting = ready === 1 ? "1 selected and ready to send" : `${ready} selected and ready to send`
  return `${people}. ${waiting}.`
}

function rank(claim) {
  if (claim.status === "selected" && !claim.letterSentAt) return 0
  if (claim.status === "review") return 1
  if (claim.status === "received") return 2
  if (claim.status === "selected") return 3
  return 4
}

function ordered(claims) {
  return [...claims].sort((a, b) => rank(a) - rank(b) || String(b.createdAt).localeCompare(String(a.createdAt)))
}

function noticeLabel(value) {
  if (value === "sent") return "Desk notice sent"
  if (value === "failed") return "Desk notice failed"
  if (value === "unconfigured") return "Desk notice waiting for Brevo"
  return "Desk notice queued"
}

export default function ClaimsDesk({ pass }) {
  const [mail, setMail] = useState(null)
  const [claims, setClaims] = useState([])
  const [error, setError] = useState("")

  async function load() {
    const response = await fetch("/api/admin/claims", {
      headers: { "X-Admin-Pass": pass },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error || "The claims could not be loaded.")
      return
    }
    setError("")
    setMail(body.mail)
    setClaims(body.claims || [])
  }

  useEffect(() => {
    let active = true
    load().catch(() => {
      if (active) setError("The claims could not be loaded.")
    })
    const timer = setInterval(() => {
      if (active) load().catch(() => {})
    }, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [pass])

  async function saveStanding(id, status) {
    const response = await fetch(`/api/admin/claims/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Pass": pass,
      },
      body: JSON.stringify({ status }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || "The standing could not be saved.")
    setMail(body.mail)
    setClaims(body.claims || [])
  }

  return (
    <section className="admin-desk" id="claims">
      <p className="kicker">Claims</p>
      <h2>The desk</h2>
      <p className="lede">
        Every finished entry appears here with the name, email, phone, country, prize, and amount.
        Set the standing to Selected, then send the congratulations letter.
      </p>
      {mail ? <MailState mail={mail} /> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="desk-tools">
        <button className="btn btn-ghost" type="button" onClick={() => load().catch(() => setError("The claims could not be loaded."))}>
          Refresh
        </button>
      </div>
      {claims.length === 0 ? (
        <p className="lede">No claims yet. A finished entry appears here with its details.</p>
      ) : (
        <div className="claim-list">
          <p className="lede">{queueLabel(claims)}</p>
          {ordered(claims).map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              pass={pass}
              onStanding={saveStanding}
              onDone={(body) => {
                setMail(body.mail)
                setClaims(body.claims || [])
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function MailState({ mail }) {
  if (mail.configured) {
    return (
      <p className="mail-state">
        Brevo is connected. New claims notify {mail.adminTo}. Letters send from {mail.from}.
      </p>
    )
  }
  return (
    <p className="mail-state">
      Brevo is not connected yet. Claims still register. Set BREVO_SMTP_LOGIN, BREVO_SMTP_KEY,
      MAIL_FROM, and ADMIN_EMAIL on the server, then send a desk test below. ADMIN_EMAIL is the
      inbox that receives each new claim. If it is empty, notices go to MAIL_FROM.
    </p>
  )
}

function ClaimCard({ claim, pass, onStanding, onDone }) {
  const [standing, setStanding] = useState(claim.status)
  const [delivery, setDelivery] = useState(claim.deliveryUrl || "")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setStanding(claim.status)
    setDelivery((current) => current || claim.deliveryUrl || "")
  }, [claim.status, claim.deliveryUrl])

  async function changeStanding(next) {
    setStanding(next)
    setError("")
    setNote("")
    try {
      await onStanding(claim.id, next)
      setNote("Standing saved.")
    } catch (reason) {
      setStanding(claim.status)
      setError(reason.message)
    }
  }

  async function post(path, payload) {
    setBusy(true)
    setError("")
    setNote("")
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error || "That step could not be completed.")
        if (body.claims) onDone(body)
        return
      }
      onDone(body)
      return true
    } catch {
      setError("That step could not be completed.")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function sendLetter(event) {
    event.preventDefault()
    const sent = await post(`/api/admin/claims/${claim.id}/letter`, {
      deliveryUrl: delivery.trim() || "https://futuredraw.live/",
    })
    if (sent) setNote(`Congratulations letter sent to ${claim.email}.`)
  }

  const selected = claim.status === "selected"
  const closed = standing === "closed"
  const referrer = claim.referredBy
    ? `${claim.referredBy}${claim.referrerName ? ` · ${claim.referrerName}` : ""}${claim.referrerEmail ? ` · ${claim.referrerEmail}` : ""}`
    : "Direct entry"

  return (
    <article className="claim-card">
      <p className="claim-code">{claim.id}</p>
      <p className="claim-mail">{claim.email}</p>
      <p className="claim-cash">{formatCash(Number(claim.cash) || 0)}</p>
      <dl className="claim-facts">
        <dt>Name</dt>
        <dd>{claim.name}</dd>
        <dt>Email</dt>
        <dd>{claim.email}</dd>
        <dt>Phone</dt>
        <dd>{claim.phone || "None"}</dd>
        <dt>Country</dt>
        <dd>{claim.country || "None"}</dd>
        <dt>Prize</dt>
        <dd>{claim.prizeName}</dd>
        <dt>Amount</dt>
        <dd>{formatCash(Number(claim.cash) || 0)}</dd>
        <dt>Chances</dt>
        <dd>{claim.chances}</dd>
        <dt>Registered</dt>
        <dd>{formatWhen(claim.createdAt)}</dd>
        <dt>Referred by</dt>
        <dd>{referrer}</dd>
        <dt>Brought in</dt>
        <dd>
          {claim.brought.length === 0
            ? "Nobody yet"
            : claim.brought.map((person) => `${person.id} · ${person.email}`).join("; ")}
        </dd>
      </dl>
      <p className="claim-meta">{noticeLabel(claim.adminNotice)}</p>
      {claim.letterSentAt ? (
        <p className="claim-meta">Congratulations letter sent {formatWhen(claim.letterSentAt)}</p>
      ) : null}
      {claim.letterError ? <p className="error">{claim.letterError}</p> : null}
      <div className="field claim-standing">
        <label htmlFor={`standing-${claim.id}`}>Standing</label>
        <select
          id={`standing-${claim.id}`}
          value={standing}
          onChange={(event) => changeStanding(event.target.value)}
        >
          {standings.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <form className="letter-panel" onSubmit={sendLetter} noValidate>
        <p className="kicker">Letter</p>
        <p className="letter-hint">
          {selected
            ? `Send the congratulations letter to ${claim.email}. It shows ${formatCash(Number(claim.cash) || 0)}. An empty link opens the Future Draw site.`
            : "Set the standing to Selected. The send button turns on after that."}
        </p>
        <div className="field">
          <label htmlFor={`delivery-${claim.id}`}>Paste the link</label>
          <input
            id={`delivery-${claim.id}`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
            placeholder="https://"
            value={delivery}
            onChange={(event) => setDelivery(event.target.value)}
          />
        </div>
        {delivery.trim() ? <p className="claim-meta">The button opens {delivery.trim()}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {note ? <p className="claim-meta">{note}</p> : null}
        <div className="drawer-actions">
          <button className="btn" type="submit" disabled={busy || !selected}>
            {busy ? "Sending…" : "Send the letter"}
          </button>
          {claim.adminNotice !== "sent" ? (
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => post(`/api/admin/claims/${claim.id}/notify`, {}).then((sent) => {
                if (sent) setNote("Desk notice sent.")
              })}
            >
              Notify the desk
            </button>
          ) : null}
        </div>
        {closed ? <p className="claim-meta">This claim is closed. Select it again before sending a letter.</p> : null}
      </form>
    </article>
  )
}
