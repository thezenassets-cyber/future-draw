const MINE = "meridian-draw-mine"

export function inviteRef() {
  return new URLSearchParams(window.location.search).get("ref") || ""
}

export function inviteLink(id) {
  const url = new URL(window.location.href)
  url.hash = ""
  url.search = ""
  url.searchParams.set("ref", id)
  return url.toString()
}

export function rememberEntry(id) {
  localStorage.setItem(MINE, id)
}

export function rememberedEntryId() {
  return localStorage.getItem(MINE) || ""
}

export async function getEntry(id) {
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}`, { cache: "no-store" })
  if (response.status === 404) return null
  if (!response.ok) throw new Error("Could not load the entry.")
  return response.json()
}

export async function saveEntry(record) {
  const response = await fetch("/api/entries", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  })
  if (!response.ok) throw new Error("The entry could not be saved.")
  return response.json()
}

export function chanceCount(entry) {
  return 1 + (Number(entry?.bonusEntries) || 0)
}
