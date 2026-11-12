import { mkdirSync, writeFileSync } from "node:fs";

// Development-time import only. Players use the bundled snapshot without API calls.
const source =
  "https://api.open5e.com/v2/spells/?document__key=srd-2024&limit=500";
let next = source;
const records = [];
while (next) {
  const response = await fetch(next, { signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error(`Spell download failed: ${response.status}`);
  const page = await response.json();
  if (!Array.isArray(page.results))
    throw new Error("Unexpected spell catalog response");
  records.push(...page.results);
  next = page.next;
  if (next && new URL(next).origin !== new URL(source).origin)
    throw new Error("Unexpected pagination host");
}
const spells = records
  .map((s) => {
    if (
      s.document?.key !== "srd-2024" ||
      !s.name ||
      !Number.isInteger(s.level) ||
      !s.classes?.length
    )
      throw new Error(`Invalid spell: ${s.name}`);
    // Open5e omits this paragraph; restored from SRD 5.2 p.137 (CC-BY-4.0).
    if (s.key === "srd-2024_greater-invisibility" && !s.desc)
      s.desc =
        "A creature you touch has the Invisible condition until the spell ends.";
    if (!s.desc) throw new Error(`Missing description: ${s.name}`);
    return {
      key: s.key,
      name: s.name,
      level: s.level,
      classes: s.classes.map((c) => c.name),
      school: s.school.name,
      castingTime: [s.casting_time, s.reaction_condition]
        .filter(Boolean)
        .join(": "),
      range: s.range_text,
      components: [
        s.verbal ? "V" : null,
        s.somatic ? "S" : null,
        s.material
          ? `M (${s.material_specified || "see spell description"})`
          : null,
      ]
        .filter(Boolean)
        .join(", "),
      duration: s.duration,
      concentration: s.concentration,
      ritual: s.ritual,
      description: s.desc || "",
      higherLevel: s.higher_level || "",
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "en"));
if (
  spells.length < 300 ||
  new Set(spells.map((s) => s.key)).size !== spells.length
)
  throw new Error("Catalog is incomplete or has duplicate keys");
mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/spells-2024.json",
  JSON.stringify(
    {
      source,
      document: "System Reference Document 5.2",
      license: "CC-BY-4.0",
      spells,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Bundled ${spells.length} SRD 2024 spells. Longest description: ${Math.max(...spells.map((s) => s.description.length + s.higherLevel.length))} characters.`,
);
