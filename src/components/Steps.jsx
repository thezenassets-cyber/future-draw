function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function Steps({ selected, entry, onDetails, onCode }) {
  const steps = [
    {
      index: "01",
      title: "Choose a prize",
      body: "Pick one prize and its cash amount. Each prize is drawn on its own.",
      label: "See the prizes",
      ready: true,
      done: Boolean(selected),
      onClick: () => goTo("prizes"),
    },
    {
      index: "02",
      title: "Claim your entry",
      body: selected
        ? `Enter your details for the ${selected.name}. Your identification code comes after this step.`
        : "This step opens after you choose a prize.",
      label: entry ? "Details complete" : "Continue to your details",
      ready: Boolean(selected) && !entry,
      done: Boolean(entry),
      onClick: onDetails,
    },
    {
      index: "03",
      title: "Your identification",
      body: entry
        ? "Your code is ready. The entry email is on its way. The congratulations letter follows about one minute later."
        : "Your identification code is issued here, after the claim details are complete.",
      label: entry ? "Show your code" : "Finish the claim first",
      ready: Boolean(entry),
      done: false,
      onClick: onCode,
    },
  ]

  return (
    <section className="band" id="how">
      <div className="wrap">
        <header className="section-head" data-reveal>
          <p className="kicker">How it works</p>
          <h2>Three steps to an entry.</h2>
        </header>
        <ol className="steps" data-reveal>
          {steps.map((step) => (
            <li key={step.index} className={step.ready || step.done ? undefined : "is-locked"}>
              <span className="step-index">{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!step.ready}
                onClick={step.onClick}
              >
                {step.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
