// groundingFacts.js — a small curated fact base for common CBSE grade 6-10
// science/math topics. This is not full RAG (no embeddings/vector search),
// but it's a real accuracy guardrail: when a teacher's topic matches one of
// these entries, the verified snippet is injected into the prompt and the
// model is told to prefer it over its own recall, which meaningfully reduces
// hallucination risk for exactly the topics most likely to come up in a
// grade 6-10 classroom. Topics that don't match fall back to plain model
// knowledge — this is a guardrail for the common case, not a closed system.

const FACTS = [
  {
    keywords: ['photosynthesis'],
    fact: 'Photosynthesis: plants use sunlight, water, and carbon dioxide to make glucose (food) and release oxygen. It happens mainly in leaves, in cells containing chlorophyll. Equation: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2.',
  },
  {
    keywords: ['gravity', 'gravitation'],
    fact: "Gravity is the force of attraction between any two objects with mass. Earth's gravity pulls objects toward its center, giving them weight. Newton's law of universal gravitation: F = G(m1*m2)/r^2. Gravity is why things fall and why planets orbit the sun.",
  },
  {
    keywords: ['fraction', 'fractions'],
    fact: 'A fraction represents a part of a whole, written as numerator/denominator (e.g. 3/4 means 3 parts out of 4 equal parts). Fractions with the same denominator are added/subtracted by combining numerators. To compare or add fractions with different denominators, find a common denominator first.',
  },
  {
    keywords: ['water cycle', 'hydrological cycle'],
    fact: 'The water cycle: evaporation (water heats up and turns to vapor) -> condensation (vapor cools and forms clouds) -> precipitation (rain/snow falls) -> collection (water gathers in rivers, lakes, oceans, groundwater) -> evaporation again. Driven by the sun\'s energy.',
  },
  {
    keywords: ['states of matter', 'solid liquid gas'],
    fact: 'Matter exists mainly as solid (fixed shape and volume, particles tightly packed), liquid (fixed volume, takes the shape of its container, particles close but can move), and gas (no fixed shape or volume, particles far apart and move freely). Heating/cooling causes melting, freezing, evaporation, condensation, sublimation.',
  },
  {
    keywords: ["newton's laws", 'newtons law', 'laws of motion'],
    fact: "Newton's three laws of motion: 1) An object stays at rest or in uniform motion unless acted on by a net force (inertia). 2) Force = mass x acceleration (F=ma). 3) For every action there is an equal and opposite reaction.",
  },
  {
    keywords: ['food chain', 'food web'],
    fact: 'A food chain shows energy flow: producers (plants, make their own food via photosynthesis) -> primary consumers (herbivores, eat plants) -> secondary consumers (carnivores, eat herbivores) -> tertiary consumers/apex predators. Decomposers break down dead matter and recycle nutrients.',
  },
  {
    keywords: ['electric circuit', 'electricity', 'current electricity'],
    fact: 'An electric circuit is a closed loop through which current flows from a power source (like a battery), through a conductor, to a load (like a bulb), and back. Current (I, amperes) = Voltage (V, volts) / Resistance (R, ohms) — Ohm\'s Law: V = IR. A circuit must be complete (closed) for current to flow.',
  },
  {
    keywords: ['sound', 'sound wave'],
    fact: 'Sound is a wave caused by vibrations that travels through a medium (air, water, solids) as compressions and rarefactions. It cannot travel through a vacuum. Pitch depends on frequency (higher frequency = higher pitch); loudness depends on amplitude. Speed of sound in air is about 343 m/s at room temperature.',
  },
  {
    keywords: ['light', 'reflection', 'refraction'],
    fact: 'Reflection: light bounces off a surface; angle of incidence = angle of reflection. Refraction: light bends when passing between two media of different density (e.g., air to water), because its speed changes. These principles explain mirrors, lenses, and why a straw looks bent in water.',
  },
  {
    keywords: ['cell', 'cell structure', 'plant cell', 'animal cell'],
    fact: 'The cell is the basic unit of life. Both plant and animal cells have a nucleus (controls activities, contains DNA), cytoplasm, and cell membrane. Plant cells additionally have a rigid cell wall, chloroplasts (for photosynthesis), and a large central vacuole, which animal cells lack.',
  },
  {
    keywords: ['respiration', 'breathing'],
    fact: 'Respiration is how cells release energy from food. In aerobic respiration: glucose + oxygen -> carbon dioxide + water + energy. Breathing (inhaling oxygen, exhaling carbon dioxide) supplies the oxygen needed for this process and removes the waste CO2.',
  },
  {
    keywords: ['ecosystem'],
    fact: 'An ecosystem is a community of living organisms (plants, animals, microbes) interacting with each other and their physical environment (soil, water, climate). Energy flows through producers, consumers, and decomposers; matter cycles (e.g., carbon, water, nitrogen cycles) within the system.',
  },
  {
    keywords: ['simple machine', 'lever', 'pulley'],
    fact: 'Simple machines make work easier by changing the size or direction of a force. A lever pivots on a fulcrum to lift loads with less effort. A pulley uses a wheel and rope to change the direction of force, making lifting easier. Mechanical advantage = load / effort.',
  },
  {
    keywords: ['magnet', 'magnetism'],
    fact: 'Magnets have two poles (north and south); like poles repel, unlike poles attract. Magnetic force acts through a magnetic field. Materials like iron, nickel, and cobalt are attracted to magnets (ferromagnetic); most other materials are not.',
  },
  {
    keywords: ['acid', 'base', 'ph'],
    fact: 'Acids taste sour, turn blue litmus red, and have pH below 7 (e.g., lemon juice, vinegar). Bases taste bitter, turn red litmus blue, and have pH above 7 (e.g., soap, baking soda). Pure water is neutral at pH 7. Acid + base -> salt + water (neutralization).',
  },
  {
    keywords: ['atom', 'molecule'],
    fact: 'An atom is the smallest unit of an element, made of protons (positive, in nucleus), neutrons (neutral, in nucleus), and electrons (negative, orbiting the nucleus). A molecule forms when two or more atoms bond together (e.g., H2O is a molecule of two hydrogen atoms and one oxygen atom).',
  },
  {
    keywords: ['friction'],
    fact: 'Friction is a force that opposes relative motion between two surfaces in contact. It depends on the nature of the surfaces and the force pressing them together, not on the area of contact. Friction is useful (walking, brakes) but also causes energy loss as heat (wasted energy in machines).',
  },
];

/** Returns a verified fact snippet if the topic matches a known entry, else null. */
export function findGroundingFact(topic) {
  if (!topic) return null;
  const lower = topic.toLowerCase();
  const match = FACTS.find((entry) => entry.keywords.some((kw) => lower.includes(kw)));
  return match ? match.fact : null;
}
