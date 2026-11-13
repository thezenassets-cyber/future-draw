import { useState } from "react"
import { site } from "../config.js"
import { formatDrawWhen, setDrawDuration, useCountdown, useDrawEnd } from "../draw.js"

function pad(value) {
  return String(value).padStart(2, "0")
}

export default function Admin() {
  const end = useDrawEnd()
  const time = useCountdown(end)
  const when = formatDrawWhen(end)
  const [pass, setPass] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [passError, setPassError] = useState("")
  const [days, setDays] = useState("1")
  const [hours, setHours] = useState("2")
  const [formError, setFormError] = useState("")
  const [saved, setSaved] = useState(null)
  const [testTo, setTestTo] = useState("")
  const [testNote, setTestNote] = useState("")
  const [testError, setTestError] = useState("")

  function unlock(event) {
    event.preventDefault()
    if (pass !== site.adminPass) {
      setPassError("That passphrase is not recognized.")
      return
    }
    setPassError("")
    setUnlocked(true)
  }

  function save(event) {
    event.preventDefault()
    const dayCount = Number(days)
    const hourCount = Number(hours)
    const whole = Number.isInteger(dayCount) && Number.isInteger(hourCount)
    if (!whole || dayCount < 0 || hourCount < 0 || (dayCount === 0 && hourCount === 0)) {
      setFormError("Enter a duration of at least one hour.")
      setSaved(null)
      return
    }
    const next = setDrawDuration({ days: dayCount, hours: hourCount })
    setFormError("")
    setSaved(formatDrawWhen(next))
  }

  async function sendTest(event) {
    event.preventDefault()
    setTestError("")
    setTestNote("")
    try {
      const response = await fetch("/api/admin/test-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify({ to: testTo.trim() }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setTestError(body.error || "The letter could not be sent.")
        return
      }
      setTestNote(`Test letter sent to ${testTo.trim()}.`)
    } catch {
      setTestError("The letter could not be sent.")
    }
  }

  return (
    <main className="admin">
      <div className="wrap">
        <p className="kicker">Admin</p>
        <h1 className="admin-title">Draw countdown</h1>
        <p className="lede">
          Live end: {when.date} at {when.time}.
        </p>
        <div className="clock admin-clock" aria-label="Time until the draw">
          {[
            ["Days", String(time.days).padStart(2, "0")],
            ["Hours", pad(time.hours)],
            ["Min", pad(time.minutes)],
            ["Sec", pad(time.seconds)],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {unlocked ? (
          <form className="admin-panel" onSubmit={save} noValidate>
            <div className="field">
              <label htmlFor="draw-days">Days</label>
              <input
                id="draw-days"
                inputMode="numeric"
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="draw-hours">Hours</label>
              <input
                id="draw-hours"
                inputMode="numeric"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </div>
            {formError ? <p className="error">{formError}</p> : null}
            {saved ? (
              <p className="lede">Countdown set to {saved.date} at {saved.time}.</p>
            ) : null}
            <button className="btn" type="submit">
              Set duration
            </button>
          </form>
        ) : null}
        {unlocked ? (
          <form className="admin-panel" onSubmit={sendTest} noValidate>
            <p className="kicker">Desk letter</p>
            <div className="field">
              <label htmlFor="test-mail">Send a test letter</label>
              <input
                id="test-mail"
                type="email"
                autoComplete="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
              />
            </div>
            {testError ? <p className="error">{testError}</p> : null}
            {testNote ? <p className="lede">{testNote}</p> : null}
            <button className="btn" type="submit">
              Send with Brevo
            </button>
          </form>
        ) : (
          <form className="admin-panel" onSubmit={unlock} noValidate>
            <div className="field">
              <label htmlFor="admin-pass">Passphrase</label>
              <input
                id="admin-pass"
                type="password"
                autoComplete="current-password"
                value={pass}
                aria-invalid={Boolean(passError)}
                onChange={(event) => {
                  setPass(event.target.value)
                  setPassError("")
                }}
              />
              {passError ? <p className="error">{passError}</p> : null}
            </div>
            <button className="btn" type="submit">
              Continue
            </button>
          </form>
        )}
        <p className="admin-back">
          <a href="/">Back to the draw</a>
        </p>
      </div>
    </main>
  )
}
