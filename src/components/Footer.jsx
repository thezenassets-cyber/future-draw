import { site } from "../config.js"
import { formatDrawWhen, useDrawEnd } from "../draw.js"

export default function Footer() {
  const when = formatDrawWhen(useDrawEnd())
  return (
    <footer className="site-footer" id="contact">
      <div className="wrap footer-grid">
        <div>
          <p className="logo">
            {site.mark} <span>Draw</span>
          </p>
          <p className="lede">A customer promotion with six prizes, from the Roadster to Optimus Gen 3.</p>
        </div>
        <div>
          <p className="kicker">Contact</p>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          <p className="lede"><a href="/privacy.html">Privacy</a></p>
          <p className="lede">
            Draw date {when.date}, {when.time}.
          </p>
        </div>
        <p className="legal">
          {site.brand} is a customer promotion. It is not affiliated with Tesla, Inc.
          Photographs are promotional images of the prize vehicles and Optimus Gen 3. No fee is
          required to enter. The entry email confirms the identification code. The congratulations
          letter follows about one minute later, unless the desk holds the claim.
        </p>
      </div>
    </footer>
  )
}
