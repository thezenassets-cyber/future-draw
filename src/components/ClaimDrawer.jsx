import { useEffect, useId, useState } from "react"
import { site } from "../config.js"
import { chanceCount, inviteLink, rememberEntry, saveEntry } from "../entries.js"
import { formatCash } from "../prizes.js"

const empty = {
  name: "",
  email: "",
  phone: "",
  country: "",
  agree: false,
}

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "New Zealand",
  "Other",
]

function entryNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
  return `MD-${body}`
}

function validate(values) {
  const errors = {}
  if (values.name.trim().length < 2) errors.name = "Enter your full name."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email."
  }
  if (values.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a phone number."
  if (!values.country) errors.country = "Choose a country."
  if (!values.agree) errors.agree = "Confirm you are 18+ and accept the rules."
  return errors
}

const stages = [
  ["prize", "Prize"],
  ["details", "Details"],
  ["code", "Identification"],
]

export default function ClaimDrawer({ prize, stage, entry, referredBy, onStage, onComplete, onClose }) {
  if (!prize || !stage) return null
  return (
    <ClaimForm
      key={prize.id}
      prize={prize}
      stage={stage}
      entry={entry}
      referredBy={referredBy}
      onStage={onStage}
      onComplete={onComplete}
      onClose={onClose}
    />
  )
}

function ClaimForm({ prize, stage, entry, referredBy, onStage, onComplete, onClose }) {
  const formId = useId()
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const record = {
      id: entryNumber(),
      prizeId: prize.id,
      prizeName: prize.name,
      cash: prize.cash,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      country: values.country,
      referredBy: referredBy || null,
      bonusEntries: 0,
      createdAt: new Date().toISOString(),
    }
    try {
      const saved = await saveEntry(record)
      rememberEntry(saved.id)
      onComplete(saved)
    } catch {
      setErrors((current) => ({ ...current, form: "The entry could not be saved. Try again." }))
    }
  }

  return (
    <div className="drawer-root">
      <button className="overlay" type="button" aria-label="Close claim form" onClick={onClose} />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
      >
        <header className="drawer-head">
          <p className="kicker">Claim entry</p>
          <h2 id={`${formId}-title`}>{prize.name}</h2>
          <p className="cash">{formatCash(prize.cash)}</p>
          <button className="btn btn-ghost close" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <ol className="drawer-progress" aria-label="Claim progress">
          {stages.map(([id, label], index) => {
            const current = stages.findIndex(([name]) => name === stage)
            const className = index < current ? "is-done" : index === current ? "is-current" : undefined
            return (
              <li key={id} className={className}>
                {label}
              </li>
            )
          })}
        </ol>

        {stage === "prize" ? (
          <div>
            <p className="lede">
              You chose the {prize.name}. Continue to enter your details. Your identification
              code is issued only after that step is complete.
            </p>
            <div className="drawer-actions">
              <button className="btn" type="button" onClick={() => onStage("details")}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {stage === "code" && entry ? (
          <Identification entry={entry} onClose={onClose} />
        ) : null}

        {stage === "details" ? (
          <form onSubmit={onSubmit} noValidate>
            <Field
              id={`${formId}-name`}
              label="Full name"
              error={errors.name}
            >
              <input
                id={`${formId}-name`}
                name="name"
                autoComplete="name"
                value={values.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field id={`${formId}-email`} label="Email" error={errors.email}>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => update("email", event.target.value)}
              />
            </Field>
            <Field id={`${formId}-phone`} label="Phone" error={errors.phone}>
              <input
                id={`${formId}-phone`}
                name="phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field>
            <Field id={`${formId}-country`} label="Country" error={errors.country}>
              <select
                id={`${formId}-country`}
                name="country"
                autoComplete="country-name"
                value={values.country}
                aria-invalid={Boolean(errors.country)}
                onChange={(event) => update("country", event.target.value)}
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field">
              <label className="check" htmlFor={`${formId}-agree`}>
                <input
                  id={`${formId}-agree`}
                  name="agree"
                  type="checkbox"
                  checked={values.agree}
                  aria-invalid={Boolean(errors.agree)}
                  onChange={(event) => update("agree", event.target.checked)}
                />
                <span>I am 18 or older and I agree to the rules.</span>
              </label>
              {errors.agree ? <p className="error">{errors.agree}</p> : null}
            </div>
            {errors.form ? <p className="error">{errors.form}</p> : null}
            <div className="drawer-actions">
              <button className="btn btn-ghost" type="button" onClick={() => onStage("prize")}>
                Back
              </button>
              <button className="btn" type="submit">
                Continue
              </button>
            </div>
          </form>
        ) : null}
      </aside>
    </div>
  )
}

function Identification({ entry, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = inviteLink(entry.id)
  const chances = chanceCount(entry)
  const chanceLabel = chances === 1 ? "1 chance" : `${chances} chances`

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  async function shareLink() {
    const text = `I entered ${site.brand}. Use my link for your own chance. It is not a win.`
    if (navigator.share) {
      try {
        await navigator.share({ title: site.brand, text, url: link })
        return
      } catch {
        return
      }
    }
    await copyLink()
  }

  return (
    <div className="success">
      <p className="kicker">Identification</p>
      <h2>You're entered.</h2>
      <p className="entry-no">{entry.id}</p>
      <p>
        This code is your identification for the {entry.prizeName} and{" "}
        {formatCash(entry.cash)}. You have {chanceLabel}. This is not a selection.
        The entry email is on its way. The congratulations letter follows about one
        minute later, unless the desk holds the claim. Check the inbox and the spam
        folder.{" "}
        {entry.deskNotified
          ? "The desk has been notified of this registration."
          : "This registration is stored with the desk under your code."}
      </p>
      <div className="invite">
        <p className="kicker">Give someone a chance</p>
        <p>
          Send this link to someone you love. When they finish their own free entry, you
          receive one extra chance.
        </p>
        <p className="invite-link">{link}</p>
        <div className="drawer-actions">
          <button className="btn" type="button" onClick={copyLink}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={shareLink}>
            Share
          </button>
        </div>
      </div>
      <button className="btn" type="button" onClick={onClose}>
        Done
      </button>
    </div>
  )
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
