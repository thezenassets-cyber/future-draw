import { useEffect, useState } from "react"
import { site } from "./config.js"

const KEY = "meridian-draw-end"
const CHANGE = "meridian-draw-change"

export function getDrawEnd() {
  const stored = localStorage.getItem(KEY)
  if (stored) {
    const time = Number(stored)
    if (Number.isFinite(time)) return time
  }
  return new Date(site.drawDate).getTime()
}

export function setDrawEnd(end) {
  localStorage.setItem(KEY, String(end))
  window.dispatchEvent(new Event(CHANGE))
  return end
}

export function setDrawDuration({ days, hours, minutes = 0 }) {
  return setDrawEnd(Date.now() + days * 86400000 + hours * 3600000 + minutes * 60000)
}

export function formatDrawWhen(end = getDrawEnd()) {
  const date = new Date(end)
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  const hours24 = date.getHours()
  const suffix = hours24 >= 12 ? "p.m" : "a.m"
  const hours = hours24 % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return { date: day, time: `${hours}:${minutes} ${suffix}` }
}

export function useDrawEnd() {
  const [end, setEnd] = useState(getDrawEnd)

  useEffect(() => {
    const sync = () => setEnd(getDrawEnd())
    window.addEventListener(CHANGE, sync)
    window.addEventListener("storage", sync)
    let active = true
    fetch("/api/draw")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const end = Number(body?.end)
        if (!active || body?.end == null || !Number.isFinite(end)) return
        localStorage.setItem(KEY, String(end))
        window.dispatchEvent(new Event(CHANGE))
      })
      .catch(() => {})
    return () => {
      active = false
      window.removeEventListener(CHANGE, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  return end
}

export function useCountdown(end) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, end - now)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}
