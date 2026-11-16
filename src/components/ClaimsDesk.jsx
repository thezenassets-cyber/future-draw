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

function storageLine(storage) {
  if (!storage) return ""
  if (!storage.durable) {
    return storage.error || "The claim disk is not mounted. A claim will not be saved until the disk is attached at /var/data."
  }
  if (storage.verified) return "Claims are stored on the persistent disk and stay until you remove one."
  return "Claims stay on this desk until you remove one."
}

function mailResult(label, status, at, to, error) {
  const when = at ? formatWhen(at) : ""
  const who = to ? ` to ${to}` : ""
  if (status === "sent") return `${label}: sent${when ? ` ${when}` : ""}${who}.`
  if (status === "failed") return `${label}: failed${when ? ` ${when}` : ""}${who}. ${error || "The email could not be sent."}`
  if (status === "unconfigured") return `${label}: not sent. Brevo is not configured on this server.`
  return `${label}: not sent.`
}

function letterLine(claim) {
  if (claim.letterSentAt && !claim.letterError) {
    return mailResult("Congratulations letter", "sent", claim.letterSentAt, claim.letterSentTo, "")
  }
  if (claim.letterDueAt && !claim.letterSentAt) {
    const when = formatWhen(claim.letterDueAt)
    if (claim.letterError) return `Congratulations letter: not sent yet. ${claim.letterError} It tries again at ${when}.`
    return `Congratulations letter: sends at ${when}.`
  }
  if (claim.letterError) return mailResult("Congratulations letter", "failed", "", claim.letterSentTo, claim.letterError)
  return mailResult("Congratulations letter", "unsent")
}

function noteLine(claim) {
  if (claim.noteError) return mailResult("Message", "failed", "", claim.noteSentTo, claim.noteError)
  if (claim.noteSentAt) {
    const extra = claim.noteLink ? ", with a link" : ""
    return `Message: sent ${formatWhen(claim.noteSentAt)} to ${claim.noteSentTo || "the customer"}${extra}.`
  }
  return "Message: not sent."
}

export default function ClaimsDesk({ pass }) {
  const [mail, setMail] = useState(null)
  const [storage, setStorage] = useState(null)
  const [claims, setClaims] = useState([])
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const ticket = useRef(0)

  function show(body) {
    ticket.current += 1
    if (body.mail) setMail((current) => ({ ...current, ...body.mail }))
    if (body.storage) setStorage(body.storage)
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
    setMail((current) => ({ ...current, ...body.mail }))
    setStorage(body.storage || null)
    setClaims(body.claims || [])
  }

  useEffect(() => {
    let active = true
    fetch("/api/admin/mail", {
      cache: "no-store",
      headers: { "X-Admin-Pass": pass },
    })
      .then((response) => response.json())
      .then((body) => {
        if (active && body && typeof body.configured === "boolean") {
          setMail((current) => ({ ...current, ...body }))
        }
      })
      .catch(() => {})
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
        A claim stays here until you remove it. The entry email goes out when the customer claims. One minute later the congratulations letter follows, unless you set Under consideration or Closed first. You can still send that letter yourself.
      </p>
      {storageLine(storage) ? (
        <p className={storage?.durable ? "mail-state" : "error"}>{storageLine(storage)}</p>
      ) : null}
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
  if (mail.accepted) {
    return (
      <p className="mail-state">
        Brevo is connected. Letters send from {mail.from}. A reply arrives at {mail.adminTo}, not inside this desk.
      </p>
    )
  }
  if (mail.accepted === false) {
    return <p className="error">{mail.error || "Brevo did not accept the login."}</p>
  }
  if (mail.configured) {
    return (
      <p className="mail-state">
        Checking Brevo. Letters send from {mail.from}. A reply arrives at {mail.adminTo}, not inside this desk.
      </p>
    )
  }
  return (
    <p className="error">
      Brevo is not connected. Claims still register. The server needs BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and MAIL_FROM.
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
      <ul className="mail-results">
        <li>{mailResult("Entry email", claim.entryMail, claim.entryMailAt, claim.entryMailTo, claim.entryMailError)}</li>
        <li>{mailResult("Desk notice", claim.adminNotice, claim.adminNoticeAt, "", claim.adminNoticeError)}</li>
        <li>{letterLine(claim)}</li>
        <li>{noteLine(claim)}</li>
      </ul>
      <div className="drawer-actions desk-actions">
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy}
          onClick={() => post(`/api/admin/claims/${claim.id}/entry-mail`, {}).then((sent) => {
            if (sent) setNote("Entry email sent.")
          })}
        >
          Resend the entry email
        </button>
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
      </div>
      {note ? <p className="claim-meta">{note}</p> : null}
      <form className="letter-panel" onSubmit={sendLetter} noValidate>
        <p className="kicker">Congratulations letter</p>
        <p className="letter-hint">
          {claim.letterDueAt && !claim.letterSentAt
            ? `Sends at ${formatWhen(claim.letterDueAt)}. Set Under consideration or Closed to hold it. The claim stays until you remove it.`
            : selected
              ? "Paste the delivery link and send. The claim stays until you remove it."
              : "Paste the delivery link and send. Sending marks this claim Selected. The claim stays until you remove it."}
        </p>
        <div className="desk-fields">
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
        </div>
        {delivery.trim() ? (
          <p className="claim-meta">
            The button opens {delivery.trim()}. The letter congratulates them, names the selected car and the cash prize, then explains the package.
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="drawer-actions desk-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send the letter"}
          </button>
        </div>
        {closed ? <p className="claim-meta">This claim is closed. Select it again before sending a letter.</p> : null}
      </form>
      <CustomerNote claim={claim} pass={pass} onDone={onDone} />
      <div className="drawer-actions desk-actions claim-remove">
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
    </article>
  )
}

function CustomerNote({ claim, pass, onDone }) {
  const [to, setTo] = useState(claim.email)
  const [message, setMessage] = useState("")
  const [includeLink, setIncludeLink] = useState(false)
  const [link, setLink] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState("")

  async function submit(event) {
    event.preventDefault()
    const inbox = to.trim()
    if (message.trim().length < 2) {
      setError("Write the message first.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inbox)) {
      setError("Enter the email that should receive the message.")
      return
    }
    if (includeLink && !link.trim()) {
      setError("Paste the link, or turn the link off.")
      return
    }
    setBusy(true)
    setError("")
    setSent("")
    try {
      const response = await fetch(`/api/admin/claims/${claim.id}/note`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify({
          to: inbox,
          message: message.trim(),
          includeLink,
          link: includeLink ? link.trim() : "",
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error || "The message could not be sent.")
        if (body.claims) onDone(body)
        return
      }
      onDone(body)
      setMessage("")
      setLink("")
      setIncludeLink(false)
      setSent(includeLink ? `Message sent to ${inbox}, with the link.` : `Message sent to ${inbox}. No link was included.`)
    } catch {
      setError("The message could not be sent.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="letter-panel" onSubmit={submit} noValidate>
      <p className="kicker">Write to the customer</p>
      <p className="letter-hint">A plain note from the desk. Add a link only when you want one in the email.</p>
      <div className="field">
        <label htmlFor={`note-to-${claim.id}`}>Send the message to</label>
        <input
          id={`note-to-${claim.id}`}
          type="email"
          autoComplete="off"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`note-message-${claim.id}`}>Message</label>
        <textarea
          id={`note-message-${claim.id}`}
          value={message}
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
      <label className="check" htmlFor={`note-link-toggle-${claim.id}`}>
        <input
          id={`note-link-toggle-${claim.id}`}
          type="checkbox"
          checked={includeLink}
          onChange={(event) => setIncludeLink(event.target.checked)}
        />
        <span>Add a link to this email</span>
      </label>
      {includeLink ? (
        <div className="field">
          <label htmlFor={`note-link-${claim.id}`}>Link</label>
          <input
            id={`note-link-${claim.id}`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
            placeholder="https://"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {sent ? <p className="desk-note">{sent}</p> : null}
      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send the message"}
      </button>
    </form>
  )
}
