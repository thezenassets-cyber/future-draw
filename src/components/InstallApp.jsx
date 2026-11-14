import { useEffect, useState } from "react"

function installedAlready() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  )
}

function appleDevice() {
  const agent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export default function InstallApp({ desk = false }) {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [apple, setApple] = useState(false)

  useEffect(() => {
    setInstalled(installedAlready())
    setApple(appleDevice())
    function offer(event) {
      event.preventDefault()
      setPrompt(event)
    }
    function done() {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", offer)
    window.addEventListener("appinstalled", done)
    return () => {
      window.removeEventListener("beforeinstallprompt", offer)
      window.removeEventListener("appinstalled", done)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === "accepted") setInstalled(true)
    setPrompt(null)
  }

  const name = desk ? "the desk" : "Future Draw"
  return (
    <section className="install" aria-label={desk ? "Install the desk" : "Install Future Draw"}>
      <div className="wrap install-inner">
        <div>
          <p className="kicker">{desk ? "Desk app" : "On this device"}</p>
          <h2>{desk ? "Keep the desk" : "Keep Future Draw"}</h2>
          <p>
            Install {name} on an iPhone, an Android phone, or a computer.{" "}
            {desk
              ? "The countdown, the claims, and the letters open as their own app."
              : "The prizes, the countdown, and an identification code stay one tap away."}
          </p>
          {apple ? (
            <p>On iPhone or iPad, tap Share, then Add to Home Screen.</p>
          ) : prompt ? null : (
            <p>
              On a computer, use Chrome or Edge. Open the browser menu, or the install icon in the
              address bar, and choose {desk ? "Future Draw Desk" : "Future Draw"}.
            </p>
          )}
        </div>
        {prompt ? (
          <button className="btn" type="button" onClick={install}>
            {desk ? "Install the desk" : "Install Future Draw"}
          </button>
        ) : null}
      </div>
    </section>
  )
}
