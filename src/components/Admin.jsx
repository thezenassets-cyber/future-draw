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
