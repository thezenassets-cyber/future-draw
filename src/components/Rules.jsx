import { site } from "../config.js"
import { formatDrawWhen, useDrawEnd } from "../draw.js"

export default function Rules() {
  const when = formatDrawWhen(useDrawEnd())
  const rules = [
    ["Eligibility", "Customers aged 18 or older. One entry per person."],
    ["Fee", "No purchase and no payment to claim an entry."],
    ["Draw", `The draw is on ${when.date} at ${when.time}. Odds depend on the number of entries.`],
    ["Notice", "A winner is contacted by email and phone. An entry is not a win."],
    ["Invite", "A finished invite adds one extra entry for the person who shared the link. The friend is entered on their own. An invite is not a win."],
    ["Payment", "Cash is paid to the verified winner after the draw."],
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
            Claiming a prize records your entry. It does not mean you have won.
            One winner is drawn for each prize on the published date.
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
