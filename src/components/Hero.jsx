import { formatDrawWhen, useCountdown, useDrawEnd } from "../draw.js"
import { formatCash } from "../prizes.js"

function pad(value) {
  return String(value).padStart(2, "0")
}

export default function Hero({ prize, onClaim }) {
  const end = useDrawEnd()
  const when = formatDrawWhen(end)
  const time = useCountdown(end)
  const units = [
    ["Days", String(time.days).padStart(2, "0")],
    ["Hours", pad(time.hours)],
    ["Min", pad(time.minutes)],
    ["Sec", pad(time.seconds)],
  ]

  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="kicker">Customer draw · {when.date}</p>
          <h1 className="display">Win the Roadster.</h1>
          <p className="hero-cash">{formatCash(prize.cash)}</p>
          <p className="lede">
            Cash paid with the car. One entry per person. No fee to claim.
          </p>
          <div className="clock" aria-label="Time until the draw">
            {units.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={() => onClaim(prize)}>
              Claim the Roadster
            </button>
            <a className="btn btn-ghost" href="#prizes">
              See prizes
            </a>
          </div>
        </div>
        <figure className="hero-frame">
          <img
            src={prize.image}
            alt={prize.alt}
            width="1280"
            height="720"
            decoding="async"
            fetchPriority="high"
          />
          <figcaption>
            <span>{prize.index}</span>
            <span>{prize.name}</span>
            <span>Promotional photograph</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
