import { useEffect, useRef, useState } from "react"
import { formatCash, prizes } from "../prizes.js"

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

function ordered(claims) {
  return [...claims].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
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
  const [query, setQuery] = useState("")
  const ticket = useRef(0)

  function show(body) {
    ticket.current += 1
    if (body.mail) setMail(body.mail)
    if (Array.isArray(body.claims)) setClaims(body.claims)
  }

  async function load() {
    const mine = ++ticket.current
    const response = await fetch("/api/admin/claims", {
      cache: "no-store",
      headers: { "X-Admin-Pass": pass },
    })
    const body = await response.json().catch(() => ({}))
    if (mine !== ticket.current) return
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
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Pass": pass,
      },
      body: JSON.stringify({ status }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || "The standing could not be saved.")
    show(body)
  }

  return (
    <section className="admin-desk" id="claims">
      <p className="kicker">Claims</p>
      <h2>The desk</h2>
      <p className="lede">
        Every claim stays here until you remove it. Add a missing person, set Selected, paste the logistics link, and send the letter to any email.
      </p>
      {mail ? <MailState mail={mail} /> : null}
      {error ? <p className="error">{error}</p> : null}
      <AddClaim
        pass={pass}
        onDone={(body) => {
          show(body)
          setQuery("")
        }}
        onError={setError}
      />
      <div className="desk-tools">
        <div className="field">
          <label htmlFor="claim-search">Find a claim</label>
          <input
            id="claim-search"
            type="search"
            value={query}
            placeholder="Name, email, or code"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => load().catch(() => setError("The claims could not be loaded."))}>
          Refresh
        </button>
      </div>
      <p className="lede desk-count">
        {claims.length === 0
          ? "No claims yet. A saved claim appears here, under the button."
          : queueLabel(claims)}
      </p>
      {claims.length === 0 ? null : (
        <div className="claim-list">
          {ordered(claims).filter((claim) => matches(claim, query)).length === 0 ? (
            <p className="lede">No claim matches that search. Clear the search to see every claim.</p>
          ) : ordered(claims).filter((claim) => matches(claim, query)).map((claim, index) => (
            <ClaimCard
              key={claim.id}
              fresh={index === 0}
              claim={claim}
              pass={pass}
              onStanding={saveStanding}
              onDone={(body) => show(body)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function matches(claim, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [claim.id, claim.name, claim.email, claim.phone, claim.country, claim.prizeName]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

function AddClaim({ pass, onDone, onError }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [prizeId, setPrizeId] = useState(prizes[0].id)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [problem, setProblem] = useState("")
  const prize = prizes.find((item) => item.id === prizeId) || prizes[0]

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setNote("")
    setProblem("")
    onError("")
    try {
      const response = await fetch("/api/admin/claims", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify({
          id: code.trim(),
          name,
          email,
          phone,
          country,
          prizeId: prize.id,
          prizeName: prize.name,
          cash: prize.cash,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = body.error || "The claim could not be added."
        setProblem(message)
        onError(message)
        return
      }
      if (!body.added?.id || !(body.claims || []).some((item) => item.id === body.added.id)) {
        const message = "The claim did not appear on the desk. Try again."
        setProblem(message)
        onError(message)
        return
      }
      onDone(body)
      setName("")
      setEmail("")
      setPhone("")
      setCountry("")
      setCode("")
      setNote(`${body.added.id} · ${body.added.name} is on the desk.`)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById("claim-added")?.scrollIntoView({ block: "start" })
        })
      })
    } catch {
      setProblem("The claim could not be added.")
      onError("The claim could not be added.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-panel" onSubmit={submit} noValidate>
      <p className="kicker">Add a claim</p>
      <p className="letter-hint">Put a missing person back, then select them and send the congratulations letter.</p>
      <div className="desk-fields">
        <div className="field">
          <label htmlFor="add-name">Name</label>
          <input id="add-name" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="add-email">Email</label>
          <input id="add-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="add-phone">Phone</label>
          <input id="add-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="add-country">Country</label>
          <input id="add-country" autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="add-prize">Prize</label>
          <select id="add-prize" value={prize.id} onChange={(event) => setPrizeId(event.target.value)}>
            {prizes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {formatCash(item.cash)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="add-code">Identification code</label>
          <input id="add-code" value={code} placeholder="Leave blank to create one" onChange={(event) => setCode(event.target.value.toUpperCase())} />
        </div>
      </div>
      {problem ? <p className="error">{problem}</p> : null}
      <button className="btn btn-block" type="submit" disabled={busy}>{busy ? "Adding…" : "Add the claim"}</button>
      {note ? <p className="desk-note" id="claim-added">{note}</p> : null}
    </form>
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

function ClaimCard({ claim, pass, onStanding, onDone, fresh = false }) {
  const [standing, setStanding] = useState(claim.status)
  const [delivery, setDelivery] = useState(claim.deliveryUrl || "")
  const [sendTo, setSendTo] = useState(claim.email)
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
        cache: "no-store",
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
    const to = sendTo.trim()
    const link = delivery.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Enter the email that should receive the letter.")
      return
    }
    if (!link) {
      setError("Paste the logistics link.")
      return
    }
    setBusy(true)
    setError("")
    setNote("")
    try {
      if (claim.status !== "selected") await onStanding(claim.id, "selected")
      const response = await fetch(`/api/admin/claims/${claim.id}/letter`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify({ deliveryUrl: link, to }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error || "The letter could not be sent.")
        if (body.claims) onDone(body)
        return
      }
      onDone(body)
      setNote(`Letter sent to ${to}.`)
    } catch (reason) {
      setError(reason.message || "The letter could not be sent.")
    } finally {
      setBusy(false)
    }
  }

  const selected = claim.status === "selected"
  const closed = standing === "closed"
  const referrer = claim.referredBy
    ? `${claim.referredBy}${claim.referrerName ? ` · ${claim.referrerName}` : ""}${claim.referrerEmail ? ` · ${claim.referrerEmail}` : ""}`
    : "Direct entry"

  return (
    <article className={fresh ? "claim-card is-fresh" : "claim-card"} id={`claim-${claim.id}`}>
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
        <p className="claim-meta">Congratulations letter sent {formatWhen(claim.letterSentAt)}{claim.letterSentTo ? ` to ${claim.letterSentTo}` : ""}</p>
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
        <p className="kicker">Send the letter</p>
        <p className="letter-hint">
          {selected
            ? "The standing is Selected. Enter the inbox and the logistics link, then send."
            : "Enter the inbox and the logistics link. Sending marks this claim Selected."}
        </p>
        <div className="field">
          <label htmlFor={`send-to-${claim.id}`}>Send the letter to</label>
          <input
            id={`send-to-${claim.id}`}
            type="email"
            autoComplete="off"
            value={sendTo}
            onChange={(event) => setSendTo(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`delivery-${claim.id}`}>Paste the logistics link</label>
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
        {delivery.trim() ? <p className="claim-meta">The button opens the logistics page {delivery.trim()}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {note ? <p className="claim-meta">{note}</p> : null}
        <div className="drawer-actions desk-actions">
          <button className="btn" type="submit" disabled={busy}>
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
          <button
            className="btn btn-ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Remove ${claim.id} from the desk?`)) return
              post(`/api/admin/claims/${claim.id}/remove`, {}).then((sent) => {
                if (sent) setNote("Claim removed.")
              })
            }}
          >
            Remove claim
          </button>
        </div>
        {closed ? <p className="claim-meta">This claim is closed. Select it again before sending a letter.</p> : null}
      </form>
    </article>
  )
}
