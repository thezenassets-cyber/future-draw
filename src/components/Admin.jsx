import { useEffect, useRef, useState } from "react"
import ClaimsDesk from "./ClaimsDesk.jsx"
import InstallApp from "./InstallApp.jsx"
import { site } from "../config.js"
import { formatDrawWhen, getDrawEnd, releaseServerClock, setDrawDuration, setDrawEnd, useCountdown, useDrawEnd } from "../draw.js"

function pad(value) {
  return String(value).padStart(2, "0")
}

const menuItems = [
  ["#claims", "Claims"],
  ["#clock", "Clock"],
  ["#test-letter", "Mail"],
]

function DeskMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function close(event) {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="desk-menu" ref={root}>
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="desk-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Menu
      </button>
      {open ? (
        <nav className="menu-panel" id="desk-menu" aria-label="Desk">
          {menuItems.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

function localInput(end) {
  const date = new Date(end)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  const [minutes, setMinutes] = useState("0")
  const [formError, setFormError] = useState("")
  const [saved, setSaved] = useState(null)
  const [exact, setExact] = useState(() => localInput(getDrawEnd()))
  const [exactError, setExactError] = useState("")
  const [exactSaved, setExactSaved] = useState(null)
  const [clockNote, setClockNote] = useState("")
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

  async function save(event) {
    event.preventDefault()
    const dayCount = Number(days)
    const hourCount = Number(hours)
    const minuteCount = Number(minutes)
    const counts = [dayCount, hourCount, minuteCount]
    const whole = counts.every((count) => Number.isInteger(count) && count >= 0)
    if (!whole || dayCount + hourCount + minuteCount === 0) {
      setFormError("Enter a duration of at least one minute.")
      setSaved(null)
      return
    }
    const next = setDrawDuration({ days: dayCount, hours: hourCount, minutes: minuteCount })
    setExact(localInput(next))
    setFormError("")
    setExactError("")
    setExactSaved(null)
    setSaved(formatDrawWhen(next))
    setClockNote(await publish(next))
  }

  async function saveExact(event) {
    event.preventDefault()
    const next = new Date(exact).getTime()
    if (!Number.isFinite(next)) {
      setExactError("Enter a date and a time.")
      setExactSaved(null)
      return
    }
    setDrawEnd(next)
    setExactError("")
    setSaved(null)
    setExactSaved(formatDrawWhen(next))
    setClockNote(await publish(next))
  }

  async function publish(end) {
    try {
      const response = await fetch("/api/admin/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass,
        },
        body: JSON.stringify({ end }),
        cache: "no-store",
      })
      if (!response.ok) return "The public clock did not reset. Set the duration again."
      return "The public countdown reset to this end."
    } catch {
      return "The public clock did not reset. Set the duration again."
    } finally {
      releaseServerClock()
    }
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
      setTestNote(`Accepted for ${testTo.trim()}. Subject: ${body.subject || "the sample letter"}. Check the inbox and spam.`)
    } catch {
      setTestError("The letter could not be sent.")
    }
  }

  return (
    <main className="admin">
      <InstallApp desk />
      <div className="wrap">
        <div className="desk-head">
          <div>
            <p className="kicker">Admin</p>
            <h1 className="admin-title">{unlocked ? "Desk" : "Draw countdown"}</h1>
          </div>
          {unlocked ? <DeskMenu /> : null}
        </div>
        {unlocked ? <ClaimsDesk pass={pass} /> : null}
        <section id="clock">
        <p className="lede">
          Live end: {when.date} at {when.time}. Set a duration or any date and time. The public
          countdown resets to that end immediately.
        </p>
        {clockNote ? <p className="lede">{clockNote}</p> : null}
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
          <>
          <form className="admin-panel" onSubmit={save} noValidate>
            <p className="kicker">Duration</p>
            <div className="admin-time">
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
              <div className="field">
                <label htmlFor="draw-minutes">Minutes</label>
                <input
                  id="draw-minutes"
                  inputMode="numeric"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </div>
            </div>
            {formError ? <p className="error">{formError}</p> : null}
            {saved ? (
              <p className="lede">Countdown set to {saved.date} at {saved.time}.</p>
            ) : null}
            <button className="btn" type="submit">
              Set duration
            </button>
          </form>
          <form className="admin-panel" onSubmit={saveExact} noValidate>
            <p className="kicker">Exact end</p>
            <div className="field">
              <label htmlFor="draw-exact">Date and time</label>
              <input
                id="draw-exact"
                type="datetime-local"
                value={exact}
                onChange={(event) => setExact(event.target.value)}
              />
            </div>
            {exactError ? <p className="error">{exactError}</p> : null}
            {exactSaved ? (
              <p className="lede">Countdown set to {exactSaved.date} at {exactSaved.time}.</p>
            ) : null}
            <button className="btn" type="submit">
              Set this time
            </button>
          </form>
          </>
        ) : null}
        </section>
        {unlocked ? (
          <form className="admin-panel" id="test-letter" onSubmit={sendTest} noValidate>
            <p className="kicker">Desk letter</p>
            <p className="letter-hint">Sends a sample of the congratulations letter. A real claim sends that letter one minute later, unless you hold the claim. This sample is not a selection. It is reported only after Brevo accepts that inbox.</p>
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
