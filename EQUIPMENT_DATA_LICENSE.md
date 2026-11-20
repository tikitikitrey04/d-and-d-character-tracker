# Equipment data attribution

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

`src/data/equipment-2024.json` bundles the standard 2024 equipment in SRD 5.2.1 pages 92–102: armor and shields; artisan and other tools; musical instrument and gaming-set variants; adventuring gear and equipment packs; ammunition and spellcasting focus variants; mounts, tack, land/air/water vehicles; barding variants; food/drink; and service prices. The combined picker also uses the existing 38-weapon catalog, covered by [WEAPON_DATA_LICENSE.md](WEAPON_DATA_LICENSE.md).

Source PDF: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf

Table reference: https://www.dndbeyond.com/sources/dnd/br-2024/equipment

Changes: descriptions were extracted from the licensed PDF, line wrapping was normalized, and table fields were structured and checked against the official equipment reference. Variants are expanded into individual choices. Barding prices and weights are calculated from the corresponding armor at four times the cost and twice the weight. Some mount, vehicle, saddle, food, and service reminders are summarized. An ammunition entry represents a priced bundle, not a single piece. Prices are reference prices; adding equipment does not deduct currency. Packs retain their listed contents in the description rather than creating duplicate inventory records for their contents.

Refresh: download the source PDF and equipment reference HTML, install `pypdf` and `beautifulsoup4` in a temporary Python environment, then run `python scripts/update-equipment-catalog.py /path/to/SRD.pdf /path/to/equipment.html` from the repository root. Review the diff and run the equipment tests before accepting an update. Players use the checked-in snapshot without external requests.

The catalog covers the standard equipment chapter, including its Potion of Healing and cantrip/level-1 Spell Scroll entries. It does not include the separate Dungeon Master's Guide magic-item collection or setting-specific equipment. The notice applies to included SRD material, not application code.

Starting-kit mechanical metadata in `shared/starting-equipment.mjs` follows the class Starting Equipment tables in SRD 5.2.1 and the [official class reference](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes), plus the [2024 background equipment reference](https://pages.roll20.net/dnd/2024-backgrounds). Package item names, quantities, currency, and allowed equipment choices are structured as data. The wizard spellbook reminder is summarized from the SRD class feature; no background narratives or feat text are bundled.
