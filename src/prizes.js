export const prizes = [
  {
    id: "roadster",
    index: "01",
    name: "Roadster",
    cash: 500000,
    image: "/prizes/roadster.jpg",
    spec: "Ano White Roadster. The one that flies.",
    alt: "Promotional photo of the Ano White flying Roadster",
    grand: true,
  },
  {
    id: "cybertruck",
    index: "02",
    name: "Cybertruck",
    cash: 92490,
    image: "/prizes/cybertruck.jpg",
    spec: "Stainless pickup, plus cash.",
    alt: "Promotional photo of the Cybertruck prize vehicle",
  },
  {
    id: "model-s",
    index: "03",
    name: "Model S Plaid",
    cash: 114990,
    image: "/prizes/model-s.jpg",
    spec: "Performance sedan, plus cash.",
    alt: "Promotional photo of the Model S Plaid prize vehicle",
  },
  {
    id: "model-x",
    index: "04",
    name: "Model X",
    cash: 99990,
    image: "/prizes/model-x.jpg",
    spec: "Three-row falcon-wing SUV, plus cash.",
    alt: "Promotional photo of the Model X prize vehicle",
  },
  {
    id: "model-y",
    index: "05",
    name: "Model Y Performance",
    cash: 57490,
    image: "/prizes/model-y.jpg",
    spec: "Crossover, plus cash.",
    alt: "Promotional photo of the Model Y Performance prize vehicle",
    pair: true,
  },
  {
    id: "optimus",
    index: "06",
    name: "Optimus Gen 3",
    cash: 50000,
    image: "/prizes/optimus.jpg",
    spec: "Tesla's production humanoid, plus cash.",
    alt: "Promotional photo of the Optimus Gen 3 robot",
    pair: true,
  },
]

export function formatCash(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}
