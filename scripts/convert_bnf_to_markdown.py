# -*- coding: utf-8 -*-
"""
BNF 83 Full Markdown Converter
Converts the 1,853-page British National Formulary PDF into structured, searchable Markdown files.
"""

import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

from pypdf import PdfReader

PDF_PATH = r"i:\Joint Formulary Committee - BNF 83 (British National Formulary) March 2022 (2022, Pharmaceutical Press) - libgen.li.pdf"
OUTPUT_DIR = r"I:\at\docs\bnf"

CHAPTER_RANGES = [
    ("00_guidance_and_prescribing.md", 0, 58, "General Guidance & Principles of Prescribing"),
    ("01_gastrointestinal_system.md", 58, 126, "Chapter 1: Gastro-intestinal system"),
    ("02_cardiovascular_system.md", 126, 276, "Chapter 2: Cardiovascular system"),
    ("03_respiratory_system.md", 276, 344, "Chapter 3: Respiratory system"),
    ("04_nervous_system.md", 344, 558, "Chapter 4: Nervous system"),
    ("05_infection.md", 558, 738, "Chapter 5: Infection"),
    ("06_endocrine_system.md", 738, 855, "Chapter 6: Endocrine system"),
    ("07_genito_urinary_system.md", 855, 918, "Chapter 7: Genito-urinary system"),
    ("08_immune_system_and_malignancy.md", 918, 1106, "Chapter 8: Immune system and malignant disease"),
    ("09_blood_and_nutrition.md", 1106, 1195, "Chapter 9: Blood and nutrition"),
    ("10_musculoskeletal_system.md", 1195, 1258, "Chapter 10: Musculoskeletal system"),
    ("11_eye.md", 1258, 1293, "Chapter 11: Eye"),
    ("12_ear_nose_oropharynx.md", 1293, 1321, "Chapter 12: Ear, nose and oropharynx"),
    ("13_skin.md", 1321, 1392, "Chapter 13: Skin"),
    ("14_vaccines.md", 1392, 1447, "Chapter 14: Vaccines"),
    ("15_anaesthesia.md", 1447, 1481, "Chapter 15: Anaesthesia"),
    ("16_emergency_poisoning.md", 1481, 1496, "Chapter 16: Emergency treatment of poisoning"),
    ("appendix_01_interactions.md", 1496, 1722, "Appendix 1: Interactions"),
    ("appendix_02_to_04_labels.md", 1722, 1769, "Appendix 2-4: Borderline Substances & Cautionary Labels"),
    ("bnf_master_index.md", 1769, 1853, "BNF 83 Master Index")
]

def format_bnf_page_to_markdown(text, page_num):
    if not text:
        return ""

    # Replace section glyphs with standard markdown headers
    t = text

    # Transform drug monograph titles (e.g. "Amoxicillin 25-Oct-2021")
    t = re.sub(r'([A-Z][a-zA-Z0-9\s\-\(\)\/\+]{2,40})\s+\d{1,2}\-[A-Za-z]{3}\-\d{4}', r'\n\n## \1\n', t)

    # Transform section titles
    section_map = [
        (r'l\s+INDICATIONS AND DOSE', r'\n\n### 🎯 Indications and Dose\n'),
        (r'l\s+CONTRA-INDICATIONS', r'\n\n### 🚫 Contra-indications\n'),
        (r'l\s+CAUTIONS', r'\n\n### ⚠️ Cautions\n'),
        (r'l\s+INTERACTIONS', r'\n\n### 🔴 Interactions\n'),
        (r'l\s+SIDE-EFFECTS', r'\n\n### ⚡ Side-effects\n'),
        (r'l\s+PREGNANCY', r'\n\n### 🤰 Pregnancy\n'),
        (r'l\s+BREAST FEEDING', r'\n\n### 🍼 Breast Feeding\n'),
        (r'l\s+HEPATIC IMPAIRMENT', r'\n\n### 🫁 Hepatic Impairment\n'),
        (r'l\s+RENAL IMPAIRMENT', r'\n\n### 🫘 Renal Impairment\n'),
        (r'l\s+MONITORING REQUIREMENTS', r'\n\n### 🔬 Monitoring Requirements\n'),
        (r'l\s+PATIENT AND CARER ADVICE', r'\n\n### 💬 Patient and Carer Advice\n'),
        (r'l\s+DIRECTIONS FOR ADMINISTRATION', r'\n\n### 📋 Directions for Administration\n'),
        (r'l\s+MEDICINAL FORMS', r'\n\n### 💊 Medicinal Forms\n'),
        (r'l\s+UNLICENSED USE', r'\n\n### ℹ️ Unlicensed Use\n'),
        (r'l\s+ALLERGY AND CROSS-SENSITIVITY', r'\n\n### ⚠️ Allergy & Cross-sensitivity\n'),
        (r'l\s+PRESCRIBING AND DISPENSING INFORMATION', r'\n\n### 📝 Prescribing & Dispensing Information\n'),
        (r'l\s+EFFECT ON LABORATORY TESTS', r'\n\n### 🧪 Effect on Laboratory Tests\n')
    ]

    for pat, rep in section_map:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)

    # Format arrow bullets
    t = re.sub(r'▶\s*(BY [A-Z\s]+)', r'\n- **Route:** `\1`\n', t)
    t = re.sub(r'▶\s*(Adult|Child|Elderly|Neonate):', r'\n- **\1:**', t)
    t = re.sub(r'▶\s*([A-Z][a-zA-Z0-9\s\-\.\'\+]+)\s*(\([^\)]+\))', r'\n- 📦 **\1** \2', t)

    return f"\n\n<!-- Page {page_num} -->\n\n{t}"

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found: {PDF_PATH}")
        return

    print("Opening BNF 83 PDF...")
    reader = PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    print(f"Total Pages to convert: {total_pages}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    master_index_links = []

    for filename, start_p, end_p, title in CHAPTER_RANGES:
        actual_end = min(end_p, total_pages)
        filepath = os.path.join(OUTPUT_DIR, filename)
        print(f"\nProcessing [{title}] (Pages {start_p + 1} to {actual_end})...")

        content = [
            f"# {title}",
            f"> **Source:** British National Formulary 83 (March 2022)",
            f"> **Publisher:** Pharmaceutical Press (Royal Pharmaceutical Society & BMA)",
            f"> **Page Range:** {start_p + 1} - {actual_end}",
            "",
            "---",
            ""
        ]

        for p_idx in range(start_p, actual_end):
            try:
                page_text = reader.pages[p_idx].extract_text()
                formatted = format_bnf_page_to_markdown(page_text, p_idx + 1)
                content.append(formatted)
            except Exception as e:
                content.append(f"\n\n<!-- Error reading page {p_idx + 1}: {e} -->\n\n")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(content))

        size_kb = os.path.getsize(filepath) / 1024
        print(f"✅ Generated: {filename} ({size_kb:.1f} KB)")
        master_index_links.append(f"- [{title}]({filename}) (pp. {start_p + 1}–{actual_end})")

    # Write Master Table of Contents
    readme_path = os.path.join(OUTPUT_DIR, "README.md")
    readme_content = [
        "# 🇬🇧 British National Formulary (BNF 83) - Markdown Knowledge Base",
        "",
        "Welcome to the high-speed Markdown edition of **BNF 83 (March 2022)**.",
        "Converted for instantaneous clinical search, live pharmacology reference, and offline querying.",
        "",
        "## 📚 Table of Contents",
        "",
        "\n".join(master_index_links),
        "",
        "---",
        "*Integrated with HodoorK Clinical Knowledge & Pharmacy Decision Support System.*"
    ]
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("\n".join(readme_content))

    print(f"\n🎉 All BNF 83 chapters successfully converted to Markdown in: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
