import json
import re
import unicodedata

from cards.models import Set


# =========================
# UTILIDADES
# =========================

def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    return text.lower().strip()


def extract_codigo(nome: str) -> str | None:
    """
    Extrai o que está entre parênteses no final do nome
    Ex: 'White Flare (WHT)' -> 'WHT'
    """
    match = re.search(r"\(([^)]+)\)$", nome)
    return match.group(1).strip() if match else None


# =========================
# MAPA NOME -> CÓDIGO LIGA
# =========================

RAW_LIGA_LIST = [
    "White Flare (WHT)",
    "Black Bolt (BLK)",
    "Destined Rivals (DRI)",
    "Journey Together (JTG)",
    "Prismatic Evolutions (PRE)",
    "Surging Sparks (SSP)",
    "Stellar Crown (SCR)",
    "Shrouded Fable (SFA)",
    "Twilight Masquerade (TWM)",
    "Temporal Forces (TEF)",
    "Paldean Fates (PAF)",
    "Paradox Rift (PAR)",
    "151 (MEW)",
    "Obsidian Flames (OBF)",
    "Paldea Evolved (PAL)",
    "Scarlet & Violet (SVI)",
    "Scarlet & Violet Promos (SVP)",
    "Crown Zenith (CRZ)",
    "Silver Tempest (SIT)",
    "Lost Origin (LOR)",
    "Pokémon GO (PGO)",
    "Astral Radiance (ASR)",
    "Brilliant Stars (BRS)",
    "Fusion Strike (FST)",
    "Celebrations (CEL)",
    "Evolving Skies (EVS)",
    "Chilling Reign (CRE)",
    "Battle Styles (BST)",
    "Shining Fates (SHF)",
    "Vivid Voltage (VIV)",
    "Champion’s Path (CPA)",
    "Darkness Ablaze (DAA)",
    "Rebel Clash (RCL)",
    "Cosmic Eclipse (CEC)",
    "Hidden Fates (HIF)",
    "Unified Minds (UNM)",
    "Unbroken Bonds (UNB)",
    "Detective Pikachu (DET)",
    "Team Up (TEU)",
    "Lost Thunder (LOT)",
    "Dragon Majesty (DRM)",
    "Celestial Storm (CES)",
    "Forbidden Light (FLI)",
    "Ultra Prism (UPR)",
    "Crimson Invasion (CIN)",
    "Shining Legends (SLG)",
    "Burning Shadows (BUS)",
    "Guardians Rising (GRI)",
    "Steam Siege (STS)",
    "Fates Collide (FCO)",
    "Generations (GEN)",
    "BREAKpoint (BKP)",
    "BREAKthrough (BKT)",
    "Ancient Origins (AOR)",
    "Roaring Skies (ROS)",
    "Double Crisis (DCR)",
    "Primal Clash (PRC)",
    "Phantom Forces (PHF)",
    "Furious Fists (FFI)",
    "Flashfire (FLF)",
]

LIGA_MAP = {}

for item in RAW_LIGA_LIST:
    codigo = extract_codigo(item)
    nome = item.replace(f"({codigo})", "").strip() if codigo else item
    LIGA_MAP[normalize(nome)] = codigo


# =========================
# FUNÇÃO PRINCIPAL
# =========================

def import_sets_from_json(json_path: str):
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    created = 0
    skipped = 0
    with_code = 0

    for item in data:
        tcgdex_id = item.get("id")
        nome = item.get("name")

        if not tcgdex_id or not nome:
            skipped += 1
            continue

        codigo_liga = LIGA_MAP.get(normalize(nome))

        obj, was_created = Set.objects.update_or_create(
            tcgdex_id=tcgdex_id,
            defaults={
                "nome": nome,
                "codigo_liga": codigo_liga,
            },
        )

        if was_created:
            created += 1
            if codigo_liga:
                with_code += 1

    print("IMPORTAÇÃO FINALIZADA")
    print(f"TOTAL NO JSON: {len(data)}")
    print(f"CRIADOS: {created}")
    print(f"COM CÓDIGO LIGA: {with_code}")
    print(f"PULADOS: {skipped}")
