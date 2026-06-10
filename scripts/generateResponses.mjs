// Generates deterministic sample POC survey responses and cleaned public comments.
// Output: src/data/responses.json and src/data/comments.json
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(readFileSync(join(root, "src/data/participationRecords.json"), "utf8"));

// Deterministic PRNG so regeneration is stable.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(arr, weights) {
  if (!weights) return arr[Math.floor(rand() * arr.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

const ages = ["Under 18", "18-29", "30-44", "45-59", "60+"];
const ageW = [1, 4, 5, 2.5, 1];
const genders = ["Female", "Male", "Prefer not to say"];
const genderW = [4.6, 4.8, 0.6];
const wards = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Not a Hulhumalé resident"];
const wardW = [2.5, 3, 3, 2, 1];
const residentTypes = ["Resident owner", "Resident tenant", "Worker in area", "Visitor"];
const residentW = [2.5, 4.5, 2, 1];

const commentBank = {
  "HDC-PP-2025-001": [
    "Please keep the big trees near the east entrance, they give the best shade in the afternoon.",
    "The play area needs a soft surface, the current one is too hard for small children.",
    "More benches for elderly residents who walk in the mornings.",
    "Lighting near the back path is very poor after 7pm.",
    "A small kiosk for water and snacks would be welcome.",
    "Please add a separate quiet garden away from the football area.",
    "Bicycle parking at both entrances would help families.",
    "Keep the open lawn for community events during Eid.",
    "Drainage floods the south corner every rainy season, fix this first.",
    "Wheelchair access from the west gate is currently impossible.",
    "Shade structures should use natural materials, not metal sheets.",
    "Outdoor exercise equipment for adults would be used a lot.",
    "Please plan bins and regular cleaning, litter is a problem on weekends.",
    "A drinking water fountain would reduce plastic waste.",
    "The park should stay free of commercial events.",
    "Add a toddler-only fenced play zone for safety.",
    "Native plants would need less watering and look beautiful.",
    "Evening walking track lighting should be warm, not harsh white.",
    "Consider a small reading corner with shade near the library side.",
    "Keep dogs out of the children's play area please.",
    "More greenery, fewer paved surfaces overall.",
    "A notice board for community announcements would be useful."
  ],
  "HDC-PP-2025-002": [
    "The crossing near the school is the most dangerous, cars never slow down.",
    "Motorcycles use the pavement when traffic is heavy, very unsafe for kids.",
    "Street lights between the mosque and ferry stop are broken.",
    "A raised crossing near the pharmacy junction is badly needed.",
    "Parked vans block the view at the corner by the market.",
    "Please add a pedestrian signal at the main junction.",
    "Speed bumps would help but need reflective paint.",
    "The school zone needs flashing warning signs at start and end times.",
    "Elderly people cannot cross in time, the road is too wide here.",
    "A cycle lane would reduce pavement conflicts.",
    "Buses stop in the middle of the road and block crossings.",
    "Zebra paint has completely faded near the park entrance.",
    "Night-time speeding is the biggest issue, especially weekends.",
    "Please widen the pavement near the corner shop, prams cannot pass.",
    "Drainage covers are broken and dangerous for cyclists.",
    "Crossing guards during school hours would help short-term.",
    "Better lighting at the ferry stop crossing please.",
    "Bollards needed to stop cars parking on the walkway.",
    "Add tactile paving for visually impaired pedestrians.",
    "Trucks should be restricted during school opening hours.",
    "A 30 km/h zone for the whole corridor makes sense."
  ],
  "HDC-PP-2025-003": [
    "Keep the swimming steps away from the kiosk zone for hygiene.",
    "We need showers and changing space near the swim access.",
    "Shade is the number one need along the whole promenade.",
    "Please protect the coral edge near segment B, it is recovering.",
    "Food kiosks are fine if waste is managed strictly.",
    "Evening seating fills up fast, double the benches.",
    "A small stage area for community events would be nice.",
    "Keep part of the waterfront natural without concrete.",
    "Lifebuoy stations along the swim area please.",
    "Lighting should not spill into the sea, it affects marine life.",
    "More bins, especially near the kiosk zones.",
    "Accessible ramp into the water for elderly swimmers.",
    "No loud music after 10pm please, residents live close by.",
    "The promenade gets very hot, plant more trees not just umbrellas.",
    "Fishing should still be allowed at the north end.",
    "Bike racks at both ends of the promenade.",
    "Public toilets are essential if kiosks are added.",
    "Keep kiosk rents fair so local small businesses can apply.",
    "A drinking water refill point would be great.",
    "Storm protection should not become a high concrete wall.",
    "Morning swimmers need somewhere safe to leave belongings."
  ],
  "HDC-PP-2026-004": [
    "Eight floors is too tall next to existing four-floor buildings.",
    "Ground-floor retail should include a pharmacy and grocery.",
    "Parking must be inside the building, street parking is already full.",
    "Option C rooftop community space sounds great for residents.",
    "Construction noise hours must be limited near the school.",
    "Keep the corner open as a small plaza, it is a meeting point.",
    "Affordable units should be part of the residential mix.",
    "The courtyard in Option A keeps more light for neighbours.",
    "Delivery vehicles need a proper bay, not the main road.",
    "Please include bicycle storage for residents."
  ],
  "HDC-PP-2026-005": [
    "Continuous shade matters more than benches, the walk is long.",
    "Drinking water points every 500 metres would be ideal.",
    "Use native salt-tolerant trees, imported species keep dying.",
    "Keep the surface smooth for wheelchairs and prams.",
    "Solar lighting along the whole corridor please.",
    "Rest points should have shade and a bench together.",
    "Separate the cycle path from the walking path where possible.",
    "Plant fruit trees in some sections for community harvesting.",
    "Avoid removing any existing mature trees during construction.",
    "Add distance markers for runners."
  ]
};

const responseCounts = {
  "HDC-PP-2025-001": 303,
  "HDC-PP-2025-002": 298,
  "HDC-PP-2025-003": 293,
  "HDC-PP-2026-004": 142,
  "HDC-PP-2026-005": 97
};

const supportBias = {
  "HDC-PP-2025-001": 0.78,
  "HDC-PP-2025-002": 0.86,
  "HDC-PP-2025-003": 0.61,
  "HDC-PP-2026-004": 0.66,
  "HDC-PP-2026-005": 0.83
};

function isoDateBetween(start, end, t) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + (e - s) * t).toISOString().slice(0, 10);
}

const responses = [];
const comments = [];

for (const rec of records) {
  const n = responseCounts[rec.recordId] ?? 0;
  if (n === 0) continue;
  const mc = rec.surveyQuestions.find((q) => q.type === "multiplechoice");
  const yn = rec.surveyQuestions.find((q) => q.type === "yesno");
  const bank = commentBank[rec.recordId] ?? [];
  const num = rec.recordId.slice(-3);
  for (let i = 0; i < n; i++) {
    const verified = rec.efaasRequired ? true : rand() < 0.35;
    const answers = {};
    if (yn) answers[yn.id] = rand() < supportBias[rec.recordId] ? "Yes" : "No";
    if (mc && mc.options) answers[mc.id] = pick(mc.options);
    if (bank.length && rand() < 0.25) {
      answers["q-comment"] = pick(bank);
    }
    responses.push({
      responseId: `SAMPLE-R-${num}-${String(i + 1).padStart(4, "0")}`,
      recordId: rec.recordId,
      submittedAt: isoDateBetween(rec.periodStart, rec.periodEnd, rand()),
      verification: verified ? "efaas-verified" : "anonymous",
      demographics: {
        ageGroup: pick(ages, ageW),
        gender: pick(genders, genderW),
        ward: pick(wards, wardW),
        residentType: pick(residentTypes, residentW)
      },
      answers,
      sample: true
    });
  }
  bank.forEach((text, i) => {
    comments.push({
      commentId: `SAMPLE-C-${num}-${String(i + 1).padStart(3, "0")}`,
      recordId: rec.recordId,
      text,
      ward: pick(wards, wardW),
      submittedAt: isoDateBetween(rec.periodStart, rec.periodEnd, rand()),
      cleaned: true
    });
  });
}

writeFileSync(join(root, "src/data/responses.json"), JSON.stringify(responses));
writeFileSync(join(root, "src/data/comments.json"), JSON.stringify(comments, null, 2));
console.log(`Wrote ${responses.length} responses and ${comments.length} comments.`);
