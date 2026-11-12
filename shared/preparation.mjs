// 2024 class tables: SRD 5.2.1 pp.31–78; PHB 2024 casting subclass tables.
const standard = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
];
const wizard = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25,
];
const sorcerer = [
  2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
];
const half = [
  2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
];
const warlock = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15,
];
const third = [
  0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
];

export function automaticPreparationLimits(c) {
  const index = c.level - 1;
  const table = {
    Bard: standard,
    Cleric: standard,
    Druid: standard,
    Wizard: wizard,
    Sorcerer: sorcerer,
    Paladin: half,
    Ranger: half,
    Warlock: warlock,
  }[c.class];
  const base =
    { Bard: 2, Cleric: 3, Druid: 2, Wizard: 3, Sorcerer: 4, Warlock: 2 }[
      c.class
    ] || 0;
  if (table)
    return {
      cantrips: base
        ? base + (c.level >= 4 ? 1 : 0) + (c.level >= 10 ? 1 : 0)
        : 0,
      prepared: table[index],
    };
  const subclass = (c.subclass || "").trim().toLowerCase();
  if (
    c.level >= 3 &&
    ((c.class === "Fighter" && subclass === "eldritch knight") ||
      (c.class === "Rogue" && subclass === "arcane trickster"))
  )
    return {
      cantrips: (c.class === "Rogue" ? 3 : 2) + (c.level >= 10 ? 1 : 0),
      prepared: third[index],
    };
  return { cantrips: 0, prepared: 0 };
}

export function preparationLimits(c) {
  return c.spellLimitOverride
    ? { cantrips: c.cantripLimit, prepared: c.preparedSpellLimit }
    : automaticPreparationLimits(c);
}

export function spellSource(c, s) {
  if (s.preparationSource === "granted") return "granted";
  if (
    s.preparationSource === "arcanum" ||
    (c.class === "Warlock" && s.level >= 6)
  )
    return "arcanum";
  return "class";
}

export function isSpellReady(c, s) {
  return s.level === 0 || spellSource(c, s) !== "class" || s.prepared;
}

export function preparationSummary(c) {
  const limits = preparationLimits(c);
  const counts = {
    cantrips: 0,
    prepared: 0,
    granted: 0,
    arcanum: { 6: 0, 7: 0, 8: 0, 9: 0 },
  };
  for (const s of c.spells) {
    const source = spellSource(c, s);
    if (source === "granted") counts.granted++;
    else if (source === "arcanum") counts.arcanum[s.level]++;
    else if (s.level === 0) counts.cantrips++;
    else if (s.prepared) counts.prepared++;
  }
  const buckets = [
    {
      key: "cantrips",
      label: "Class cantrips known",
      used: counts.cantrips,
      limit: limits.cantrips,
    },
    {
      key: "prepared",
      label: "Prepared class spells",
      used: counts.prepared,
      limit: limits.prepared,
    },
    ...[6, 7, 8, 9].map((level) => ({
      key: `arcanum${level}`,
      label: `Level ${level} Mystic Arcanum`,
      used: counts.arcanum[level],
      limit: c.class === "Warlock" && c.level >= 11 + (level - 6) * 2 ? 1 : 0,
    })),
  ];
  return {
    limits,
    counts,
    buckets,
    issues: buckets.filter((b) => b.used > b.limit),
  };
}

// Old or newly lowered limits never silently remove choices. Over-limit sheets
// may be saved, but a count that is over its limit cannot be increased further.
export function preparationIncreaseError(next, previous) {
  const before = previous ? preparationSummary(previous) : null;
  for (const bucket of preparationSummary(next).issues) {
    const oldCount =
      before?.buckets.find((b) => b.key === bucket.key)?.used || 0;
    if (bucket.used > oldCount)
      return `${bucket.label}: ${bucket.used} selected, limit ${bucket.limit}. Remove a selection, mark a legitimate feature grant, or adjust the manual preparation limits.`;
  }
  return "";
}
