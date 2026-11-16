import fs from "node:fs"
import path from "node:path"

let report = null
let mountTable

export function useMountTableForTests(table) {
  mountTable = table
  report = null
}

function procMounts() {
  if (mountTable !== undefined) return mountTable
  try {
    return fs.readFileSync("/proc/mounts", "utf8")
  } catch {
    return null
  }
}

function unescapeMount(value) {
  return String(value)
    .replace(/\\040/g, " ")
    .replace(/\\011/g, "\t")
    .replace(/\\012/g, "\n")
    .replace(/\\134/g, "\\")
}

export function directoryIsMounted(dir, mounts) {
  let target = dir
  try {
    fs.mkdirSync(dir, { recursive: true })
    target = fs.realpathSync(dir)
  } catch {
    return false
  }
  return String(mounts || "").split("\n").some((line) => {
    const mounted = unescapeMount(line.split(" ")[1] || "")
    if (!mounted) return false
    try {
      return fs.realpathSync(mounted) === target
    } catch {
      return mounted === target
    }
  })
}

function canWrite(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, ".write-test")
    fs.writeFileSync(probe, "ok")
    fs.unlinkSync(probe)
    return true
  } catch {
    return false
  }
}

const diskError = "The claim disk is not mounted. A claim will not be saved until the disk is attached at /var/data."

export function storageReport() {
  if (report) return report
  const configured = process.env.DATA_DIR
  const mounts = procMounts()
  if (mounts != null && configured) {
    const mounted = directoryIsMounted(configured, mounts)
    report = {
      durable: mounted,
      verified: mounted,
      directory: configured,
      error: mounted ? "" : diskError,
    }
    return report
  }
  const candidates = [configured, path.resolve("data"), path.join("/tmp", "future-draw")].filter(Boolean)
  for (const dir of candidates) {
    if (!canWrite(dir)) continue
    report = { durable: true, verified: false, directory: dir, error: "" }
    return report
  }
  report = { durable: true, verified: false, directory: path.resolve("data"), error: "" }
  return report
}

export function storeFile(name) {
  const status = storageReport()
  if (!status.durable) {
    const error = new Error(status.error)
    error.status = 503
    throw error
  }
  return path.join(status.directory, name)
}
