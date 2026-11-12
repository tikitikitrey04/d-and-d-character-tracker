# Spell data attribution

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The bundled catalog at `src/data/spells-2024.json` contains the SRD 5.2 spell dataset supplied by Open5e (https://open5e.com), fetched from https://api.open5e.com/v2/spells/?document__key=srd-2024&limit=500 on November 11, 2026. No paid-book or third-party spell catalogs are included.

Changes: selected fields were renamed and reorganized, class and spell-level filters were added, basic Markdown emphasis is converted to plain text when copying descriptions, and casting information is combined into a player-readable description. Open5e's missing Greater Invisibility description was restored from SRD 5.2 page 137: “A creature you touch has the Invisible condition until the spell ends.”

The import script is `scripts/update-spell-catalog.mjs`. The app uses the checked-in snapshot without external runtime requests. The source dataset may have corrections or omissions; review upstream changes before refreshing it. This license notice applies to the included SRD content, not to application code.
