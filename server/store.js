import fs from "node:fs"
import path from "node:path"

let chosen = ""

function writableDir() {
  if (chosen) return chosen
  const candidates = [process.env.DATA_DIR, path.resolve("data"), path.join("/tmp", "future-draw")].filter(Boolean)
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      const probe = path.join(dir, ".write-test")
      fs.writeFileSync(probe, "ok")
      fs.unlinkSync(probe)
      chosen = dir
      return dir
    } catch {
      // This location is not writable on the running service.
    }
  }
  chosen = path.resolve("data")
  return chosen
}

export function storeFile(name) {
  return path.join(writableDir(), name)
}
