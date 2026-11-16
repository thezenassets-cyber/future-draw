import { site } from "../config.js"
import { formatDrawWhen, useDrawEnd } from "../draw.js"

export default function Rules() {
  const when = formatDrawWhen(useDrawEnd())
  const rules = [
    ["Eligibility", "Customers aged 18 or older. One entry per person."],
    ["Fee", "No purchase and no payment to claim an entry."],
    ["Draw", `The published date is ${when.date} at ${when.time}. The congratulations letter is emailed about one minute after a claim, unless the desk holds that claim.`],
    ["Notice", "The desk emails the customer about one minute after the claim. Keep the identification code. The claim stays until the desk removes it."],
    ["Invite", "A finished invite adds one extra entry for the person who shared the link. The friend is entered on their own. An invite is not a win."],
    ["Payment", "Cash is paid with the selected claim. No fee is required."],
    ["Vehicles", `${site.brand} is not affiliated with Tesla, Inc. Cars are prizes in this promotion.`],
    ["Images", "Photographs are promotional images of the prize vehicles and Optimus Gen 3."],
  ]

  return (
    <section className="band band-alt" id="rules">
      <div className="wrap rules-grid" data-reveal>
        <div className="rules-summary">
          <p className="kicker">Rules</p>
          <h2>Plain terms for the draw.</h2>
          <p className="lede">
            A claim is registered at once. About one minute later the desk emails the
            congratulations letter, unless that claim is held. The claim stays until the desk removes it.
          </p>
        </div>
        <dl className="rules-list">
          {rules.map(([term, detail]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
