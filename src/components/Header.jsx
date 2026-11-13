import { site } from "../config.js"

const links = [
  { href: "#prizes", label: "Prizes" },
  { href: "#how", label: "How it works" },
  { href: "#rules", label: "Rules" },
  { href: "#contact", label: "Contact" },
]

export default function Header({ onClaim }) {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="logo" href="#top">
          {site.mark} <span>Draw</span>
        </a>
        <nav className="nav" aria-label="Page">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <button className="btn header-claim" type="button" onClick={onClaim}>
          Claim entry
        </button>
      </div>
    </header>
  )
}
