import { useState } from "react"
import { formatCash, prizes } from "../prizes.js"

function PrizeCard({ prize, onClaim, onActive }) {
  return (
    <article
      id={`prize-${prize.id}`}
      className={prize.grand ? "card card-grand" : prize.pair ? "card card-pair" : "card"}
      onMouseEnter={() => onActive(prize.id)}
      onFocus={() => onActive(prize.id)}
    >
      <p className="card-index">{prize.index}</p>
      <img
        src={prize.image}
        alt={prize.alt}
        width="1152"
        height="864"
        decoding="async"
        fetchPriority="high"
      />
      <div className="card-body">
        <h3>{prize.name}</h3>
        <p className="spec">{prize.spec}</p>
        <p className="cash">{formatCash(prize.cash)}</p>
        <button className="btn" type="button" onClick={() => onClaim(prize)}>
          Claim
        </button>
      </div>
    </article>
  )
}

export default function PrizeIndex({ onClaim }) {
  const [active, setActive] = useState(prizes[0].id)
  const grand = prizes[0]
  const rest = prizes.slice(1)

  return (
    <section className="band band-alt" id="prizes">
      <div className="wrap">
        <header className="section-head" data-reveal>
          <p className="kicker">Prize index</p>
          <h2>Six prizes. Cash from $50,000.</h2>
          <p className="lede">US starting prices before tax.</p>
        </header>
        <div className="grid-12 prize-board">
          <ol className="rail">
            {prizes.map((prize) => (
              <li key={prize.id}>
                <a
                  href={`#prize-${prize.id}`}
                  className={active === prize.id ? "is-active" : undefined}
                  aria-current={active === prize.id ? "true" : undefined}
                  onClick={() => setActive(prize.id)}
                >
                  <span>{prize.index}</span>
                  <span>{prize.name}</span>
                  <span>{formatCash(prize.cash)}</span>
                </a>
              </li>
            ))}
          </ol>
          <PrizeCard prize={grand} onClaim={onClaim} onActive={setActive} />
          {rest.map((prize) => (
            <PrizeCard
              key={prize.id}
              prize={prize}
              onClaim={onClaim}
              onActive={setActive}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
