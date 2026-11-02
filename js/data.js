/*
 * ЕкоСлід Пам'яті: дані калькулятора.
 * Кожне число має джерело (sources) або позначене як припущення моделі (assumption: true).
 * Значення CO2e подано діапазоном min–max на одне прощання, бо джерела мають різні межі систем.
 */
window.ECO = {
  sources: {
    tno: {
      short: "TNO, 2011",
      title: "Keijzer E.E., Kok H.J.G. Milieueffecten van verschillende uitvaarttechnieken. Звіт TNO-060-UT-2011-01366, Нідерланди, 2011",
      url: "https://publications.tno.nl/publication/34626369/bSOHo4/TNO-060-UT-2011-01366-2.pdf"
    },
    pm: {
      short: "Planet Mark, 2023",
      title: "Full Circle Funerals, Planet Mark. How can the funeral industry achieve net zero? Велика Британія, 2023",
      url: "https://www.planetmark.com/wp-content/uploads/2023/08/Funeral-Report-Industry-Professionals.pdf"
    },
    gbc: {
      short: "Green Burial Council, 2023",
      title: "Campbell B., Webster L. Carbon benefits of conservation burial. Green Burial Council, 2023",
      url: "https://www.greenburialcouncil.org/uploads/1/2/4/2/124231485/carbon_benefits_of_conservation_burial.pdf"
    },
    woodsen: {
      short: "GBC / M. Woodsen",
      title: "Green Burial Council: дані Mary Woodsen (Cornell University) про ресурси поховань у США за рік",
      url: "https://www.greenburialcouncil.org/press/"
    },
    mit: {
      short: "MIT Technology Review, 2020",
      title: "MIT Technology Review: Recompose, оцінка T. Hottle (економія 0,84–1,4 т CO2 на людину), 30 днів процесу, ≈1 куб. ярд ґрунту",
      url: "https://www.technologyreview.com/2020/10/21/1009514/recompose-startup-turning-human-bodies-into-compost/"
    },
    ashes: {
      short: "Gardening Know How",
      title: "Gardening Know How: Planting with cremains. Лужний pH і натрій праху пригнічують ріст рослин",
      url: "https://www.gardeningknowhow.com/garden-how-to/info/is-there-a-safe-way-to-bury-ashes.htm"
    }
  },

  // Коефіцієнти припущень моделі (усі позначені на сайті як припущення)
  assumptions: {
    vaultMassT: 1.0,            // маса бетонного склепу, т
    concreteEF: [0.1, 0.2],     // кг CO2e на кг армованого бетону (порядок величин)
    plotM2: 2.5,                // площа однієї могили з проходом, м²
    urnPlotM2: 0.5,             // урнова ділянка, м²
    treePlotM2: 1.0             // ділянка під деревом пам'яті, м²
  },

  scenarios: [
    {
      id: "traditional",
      name: "Традиційне поховання",
      tagline: "Бетонний склеп, бальзамування формальдегідом, дерев'яна труна",
      co2: { min: 280, max: 380 },
      co2Basis: [
        { text: "Могила, пам'ятник, труна: 180 кг CO2e (середнє поховання в Нідерландах)", src: "tno" },
        { text: "Бетонний склеп ≈1 т × 0,1–0,2 кг CO2e/кг: +100–200 кг", assumption: true }
      ],
      resources: [
        { label: "Бетон (склеп)", min: 1.0, max: 1.0, unit: "т", assumption: true },
        { label: "Бальзамувальна рідина", min: 8, max: 15, unit: "л", assumption: true },
        { label: "Деревина труни", min: 0.05, max: 0.1, unit: "м³", assumption: true }
      ],
      land: { m2: 2.5, state: "sealed", note: "Ділянка запечатана бетоном і каменем на весь строк існування кладовища" },
      sim: "grid"
    },
    {
      id: "cremation",
      name: "Класична кремація",
      tagline: "Спалювання на природному газі, урна в колумбарії або на урновій ділянці",
      co2: { min: 80, max: 126 },
      co2Basis: [
        { text: "80 кг CO2e з урахуванням переробки металів", src: "tno" },
        { text: "126 кг CO2e: енергія спалювання на природному газі", src: "pm" }
      ],
      resources: [
        { label: "Природний газ", text: "основне джерело викидів", src: "pm" },
        { label: "Деревина труни", min: 0.05, max: 0.1, unit: "м³", assumption: true },
        { label: "Хімікати", min: 0, max: 0, unit: "л" }
      ],
      land: { m2: 0.5, state: "sealed", note: "Урнова ділянка або ніша; при розвіюванні праху площа нульова" },
      sim: "columbarium"
    },
    {
      id: "natural",
      name: "Природне поховання",
      tagline: "Саван або біорозкладна труна, без бальзамування та бетону",
      co2: { min: 0, max: 13 },
      co2Basis: [
        { text: "Саме поховання без хімікатів: <1 кг CO2e", src: "pm" },
        { text: "Верхня межа: труна з масиву дуба, 12,1 кг CO2e", src: "pm" }
      ],
      resources: [
        { label: "Бетон", min: 0, max: 0, unit: "т" },
        { label: "Хімікати", min: 0, max: 0, unit: "л" },
        { label: "Саван / лоза / картон", text: "біорозкладні матеріали" }
      ],
      land: { m2: 2.5, state: "living", note: "Ділянка лишається живим ґрунтом: луг або ліс без надгробків" },
      sim: "meadow"
    },
    {
      id: "aquamation",
      name: "Аквамація",
      tagline: "Лужний гідроліз: вода, луг і температура замість вогню",
      co2: { min: -32, max: 20 },
      co2Basis: [
        { text: "−32 кг CO2e: від'ємне значення через кредит за переробку металів", src: "tno" },
        { text: "20 кг CO2e без урахування хімікатів і стоків (немає публічних даних)", src: "pm" },
        { text: "Альтернативна верхня оцінка «до 200 фунтів» (≈91 кг) наведена без джерела", src: "gbc" }
      ],
      resources: [
        { label: "Вода та луг (KOH/NaOH)", text: "обсяг не оприлюднено", src: "pm" },
        { label: "Бетон", min: 0, max: 0, unit: "т" },
        { label: "Формальдегід", min: 0, max: 0, unit: "л" }
      ],
      land: { m2: 0, state: "none", note: "Повертається кістковий мінерал; його можна розвіяти або зберегти" },
      sim: "park"
    },
    {
      id: "composting",
      name: "Компостування людини",
      tagline: "Природна органічна редукція: ≈30 днів у посудині з рослинним матеріалом",
      co2: { min: 20, max: 250 },
      co2Basis: [
        { text: "20 кг CO2e на тіло: заява компанії Recompose (формула закрита)", src: "gbc" },
        { text: "≈150 кг CO2e метану та N2O + ≈100 кг на транспорт: незалежна критична оцінка", src: "gbc" }
      ],
      resources: [
        { label: "Утворений ґрунт", min: 0.76, max: 0.76, unit: "м³", src: "mit" },
        { label: "Бетон", min: 0, max: 0, unit: "т" },
        { label: "Хімікати", min: 0, max: 0, unit: "л" }
      ],
      land: { m2: 0, state: "none", note: "Ґрунт повертають родині або в лісовідновлення" },
      sim: "garden"
    },
    {
      id: "biourn",
      name: "Біо-урна із саджанцем",
      tagline: "Прах після кремації в урні з міцелію або деревини, над нею росте дерево",
      co2: { min: 80, max: 126 },
      co2Basis: [
        { text: "Викиди визначає кремація: 80–126 кг CO2e", src: ["tno", "pm"] },
        { text: "Виробництво біо-урни: публічних LCA-даних не знайдено, не враховано", assumption: true }
      ],
      resources: [
        { label: "Природний газ (кремація)", text: "як у класичній кремації", src: "pm" },
        { label: "Нейтралізуючий субстрат", text: "потрібен: прах лужний і містить натрій", src: "ashes" },
        { label: "Бетон", min: 0, max: 0, unit: "т" }
      ],
      land: { m2: 1.0, state: "living", note: "Ділянка під деревом лишається частиною живого парку" },
      sim: "forest"
    }
  ]
};
