import { useCallback, useEffect, useState } from "react"
import Admin from "./components/Admin.jsx"
import ClaimDrawer from "./components/ClaimDrawer.jsx"
import Footer from "./components/Footer.jsx"
import Header from "./components/Header.jsx"
import InstallApp from "./components/InstallApp.jsx"
import Hero from "./components/Hero.jsx"
import InviteBanner from "./components/InviteBanner.jsx"
import PrizeIndex from "./components/PrizeIndex.jsx"
import Rules from "./components/Rules.jsx"
import Steps from "./components/Steps.jsx"
import { getEntry, inviteRef, rememberedEntryId } from "./entries.js"
import { prizes } from "./prizes.js"

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll("[data-reveal]")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      nodes.forEach((node) => node.classList.add("is-in"))
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("is-in")
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])
}

export default function App() {
  if (window.location.pathname === "/admin") return <Admin />
  return <Site />
}

function Site() {
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState(null)
  const [entry, setEntry] = useState(null)
  const [inviter, setInviter] = useState(null)
  const ref = inviteRef()
  const closeClaim = useCallback(() => setStage(null), [])
  useReveal()

  useEffect(() => {
    const id = rememberedEntryId()
    if (!id) return undefined
    let active = true
    getEntry(id)
      .then((record) => {
        if (!active || !record) return
        setEntry(record)
        setSelected(prizes.find((item) => item.id === record.prizeId) || null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const mine = rememberedEntryId()
    if (!ref || ref === mine) return undefined
    let active = true
    getEntry(ref)
      .then((record) => {
        if (active && record) setInviter(record)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [ref])

  function startClaim(prize) {
    if (entry?.prizeId === prize.id) {
      setSelected(prize)
      setStage("code")
      return
    }
    setSelected(prize)
    setEntry(null)
    setStage("prize")
  }

  async function showCode() {
    if (!entry) return
    const prize = prizes.find((item) => item.id === entry.prizeId) || selected
    if (prize) setSelected(prize)
    try {
      const fresh = await getEntry(entry.id)
      if (fresh) setEntry(fresh)
    } catch {
      // The code already on screen stays available if the refresh fails.
    }
    setStage("code")
  }

  return (
    <>
      <Header onClaim={() => startClaim(prizes[0])} />
      <InstallApp />
      <InviteBanner inviter={inviter} />
      <main>
        <Hero prize={prizes[0]} onClaim={startClaim} />
        <PrizeIndex onClaim={startClaim} />
        <Steps
          selected={selected}
          entry={entry}
          onDetails={() => selected && setStage("details")}
          onCode={showCode}
        />
        <Rules />
      </main>
      <Footer />
      <button
        className="mobile-claim"
        type="button"
        onClick={() => startClaim(selected || prizes[0])}
        hidden={Boolean(stage)}
      >
        Claim entry
      </button>
      <ClaimDrawer
        prize={selected}
        stage={stage}
        entry={entry}
        referredBy={ref && ref !== rememberedEntryId() ? ref : ""}
        onStage={setStage}
        onComplete={(record) => {
          setEntry(record)
          setStage("code")
        }}
        onClose={closeClaim}
      />
    </>
  )
}
