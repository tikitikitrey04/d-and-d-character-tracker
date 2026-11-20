"""Import standard 2024 equipment. Requires pypdf and beautifulsoup4.
Usage: python update-equipment-catalog.py SRD.pdf equipment-reference.html
Downloads and dependencies are development-only; players use the checked-in JSON.
"""
import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from pypdf import PdfReader

pdf = PdfReader(sys.argv[1])
soup = BeautifulSoup(Path(sys.argv[2]).read_text(), "html.parser")
tables = soup.find_all("table")
def rows(n):
    return [[c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])] for r in tables[n].find_all("tr")][1:]
def clean(text):
    return re.sub(r"\s+", " ", text).strip()
def key(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
def copper(cost):
    m = re.fullmatch(r"([\d,]+) (CP|SP|EP|GP|PP)", cost)
    return int(m[1].replace(",", "")) * {"CP":1,"SP":10,"EP":50,"GP":100,"PP":1000}[m[2]] if m else None

# PDF text is in logical reading order. Page 95 contains only the gear table.
text = "\n".join(pdf.pages[n-1].extract_text() for n in [93,94,96,97,98,99,100])
text = re.sub(r"System Reference Document 5\.2\.1\n\d+\n", "", text)
text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
text = text.replace("footsquare", "foot-square")
text = text.replace("Spell Scroll (Cantrip, 30 GP; \nLevel 1, 50 GP)", "Spell Scroll (Cantrip, 30 GP; Level 1, 50 GP)")
headings = list(re.finditer(r"(?m)^([^()\n]+?) \((?:[\d,]+ (?:GP|SP|CP)|Varies|Cantrip, 30 GP; Level 1, 50 GP)\)\n", text))
descriptions = {}
for i, m in enumerate(headings):
    body = text[m.end():headings[i+1].start() if i+1 < len(headings) else len(text)]
    body = re.split(r"\n(?:Other Tools|Adventuring Gear|Mounts and Vehicles|Ammunition|Arcane Focuses|Druidic Focuses|Holy Symbols)\n", body)[0]
    descriptions[m[1]] = clean(body)

items = []
def add(name, category, weight, cost, detail, **extra):
    items.append({"key":key(category+"-"+name), "name":name, "category":category, "weight":weight, "cost":cost, "costCp":copper(cost), "detail":detail, **extra})

armor = []
section = ""
for row in rows(2):
    if len(row) == 1:
        section = row[0]
        continue
    name, ac, strength, stealth, weight, cost = row
    detail = f"Armor class: {ac}. Strength requirement: {strength}. Stealth: {stealth}. {section}."
    add(name, "Armor & shields", weight, cost, detail)
    if name != "Shield": armor.append(row)
# Tools and every priced instrument/gaming-set variant.
for h in soup.find_all("h4"):
    if h.find_previous("h2").get("id") != "Tools": continue
    m = re.fullmatch(r"(.+) \(([^)]+)\)", h.get_text(" ",strip=True))
    name,cost = m.groups()
    desc = descriptions[name]
    weight = re.search(r"Weight: (.*?)(?= Utilize:)", desc)[1]
    if name in ["Gaming Set", "Musical Instrument"]:
        variant_text = desc.split("Variants: ")[1]
        for v in re.finditer(r"([^(),]+) \(([^,)]+)(?:, ([^)]+))?\)",variant_text):
            variant,price,mass = v.groups()
            variant = variant.strip().capitalize()
            add(f"{name} ({variant})", "Tools", mass or "—", price, desc.split("Variants: ")[0].strip())
    else:
        add(name,"Tools",weight,cost,desc)
for name,weight,cost in rows(3):
    if cost == "Varies": continue
    base = "Spell Scroll" if name.startswith("Spell Scroll") else name
    if base not in descriptions: raise ValueError(f"Missing SRD description: {base}")
    category = "Equipment packs" if name.endswith("Pack") else "Adventuring gear"
    add(name, category, weight, cost, descriptions[base])
for name,amount,storage,weight,cost in rows(4):
    add(f"{name} ({amount})", "Ammunition", weight, cost, f"One bundle contains {amount} pieces. Typical storage: {storage}, purchased separately. {descriptions['Ammunition']}")
for table,parent in [(5,"Arcane Focus"),(6,"Druidic Focus"),(7,"Holy Symbol")]:
    for variant,weight,cost in rows(table):
        # Preserve meaningful qualifier in details, keep a short searchable name.
        short = variant.split(" (")[0]
        add(f"{parent} ({short})", "Spellcasting focuses", weight, cost, f"Form: {variant}. {descriptions[parent]}")
for name,capacity,cost in rows(8):
    add(name,"Mounts & animals","Varies",cost,f"Carrying capacity: {capacity}. Use the creature’s stat block for speed and other statistics. A pulling animal can move up to five times its carrying capacity, including vehicle weight.")
for row in rows(9):
    if len(row) == 1: continue
    name,weight,cost = row
    if name == "Stabling per day": continue
    if name in ["Exotic","Military","Riding"]:
        name = f"Saddle ({name})"
        detail = "Includes a bit, bridle, reins, and related equipment. An exotic saddle is needed for an aquatic or flying mount."
    elif name == "Feed per day": detail = "Feed for one animal for one day."
    else: detail = "Drawn land vehicle; animals and harness are acquired separately."
    add(name,"Tack & land vehicles",weight,cost,detail)
for row in rows(10):
    name,speed,crew,passengers,cargo,ac,hp,threshold,cost = row
    add(name,"Water & air vehicles","100 lb." if name == "Rowboat" else "Varies",cost,f"Speed: {speed}. Crew: {crew}. Passengers: {passengers}. Cargo: {cargo} tons. AC: {ac}. HP: {hp}. Damage threshold: {threshold}.")
for row in armor:
    name,ac,strength,stealth,weight,cost = row
    price = f"{copper(cost)*4//100:,} GP"
    mass = f"{int(weight.split()[0])*2} lb."
    add(f"Barding ({name})","Barding",mass,price,f"Armor for a mount: AC {ac}; Stealth: {stealth}. Barding costs four times and weighs twice the corresponding armor. Does not alter the rider’s AC.")
section = ""
for row in rows(11):
    if len(row) == 1: section = row[0]; continue
    name,cost = row
    if section == "Inn Stay per Day": continue
    if section: name = f"{section} ({name})"
    add(name,"Food & drink","Varies",cost,"One meal, serving, or bottle as named; record consumption manually.")

# Services are a reference, not physical inventory entries.
services = [{"name":"Stabling per day", "cost":"5 SP"}]
section = ""
for row in rows(11):
    if len(row) == 1: section = row[0]; continue
    if section == "Inn Stay per Day": services.append({"name":f"Inn stay ({row[0]}, per day)","cost":row[1]})
for table in [12,13]:
    services += [{"name":r[0],"cost":r[1]} for r in rows(table)]
services += [{"name":f"Spellcasting (level {r[0]})", "cost":r[2], "detail":f"Availability: {r[1]}"} for r in rows(14)]
# Price and name checks catch accidental source layout changes.
assert len({i['key'] for i in items}) == len(items)
assert len([i for i in items if i['category'] == 'Armor & shields']) == 13
assert len([i for i in items if i['category'] == 'Tools']) == 37
assert all(i['costCp'] is not None and i['detail'] for i in items)
assert max(len(i['detail']) for i in items) < 1800
out = {"source":"SRD 5.2.1", "sourceUrl":"https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf", "referenceUrl":"https://www.dndbeyond.com/sources/dnd/br-2024/equipment", "license":"CC-BY-4.0", "items":items, "services":services}
Path('src/data/equipment-2024.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(len(items),dict(Counter(i['category'] for i in items)))
print('Longest detail',max((len(i['detail']),i['name']) for i in items))
