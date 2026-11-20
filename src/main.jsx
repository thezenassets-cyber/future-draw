import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./styles.css"

const desk = window.location.pathname === "/admin"
const manifest = document.createElement("link")
manifest.rel = "manifest"
manifest.href = desk ? "/desk.webmanifest" : "/manifest.webmanifest"
document.head.appendChild(manifest)
if (desk) {
  document.title = "Future Draw desk"
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (appleTitle) appleTitle.setAttribute("content", "Draw Desk")
  document.getElementById("chatway")?.remove()
  document.getElementById("crisp-chatbox")?.remove()
  document.querySelector(".crisp-client")?.remove()
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {})
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
