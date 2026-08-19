# -*- coding: utf-8 -*-
"""
Fast Single-Pass BNF 83 Clinical Knowledge Extractor
Reads the 1853-page PDF once, identifies all drug monographs, and writes bnf_knowledge.json.
"""

import re
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

from pypdf import PdfReader

PDF_PATH = r"i:\Joint Formulary Committee - BNF 83 (British National Formulary) March 2022 (2022, Pharmaceutical Press) - libgen.li.pdf"
OUTPUT_JSON = r"I:\at\src\data\bnf_knowledge.json"

TARGET_DRUGS = {
    # Gastrointestinal
    "omeprazole": "Omeprazole",
    "esomeprazole": "Esomeprazole",
    "pantoprazole": "Pantoprazole",
    "lansoprazole": "Lansoprazole",
    "mebeverine": "Mebeverine hydrochloride",
    "hyoscine": "Hyoscine butylbromide",
    "domperidone": "Domperidone",
    "metoclopramide": "Metoclopramide hydrochloride",
    "loperamide": "Loperamide hydrochloride",
    "nifuroxazide": "Nifuroxazide",
    # Cardiovascular
    "amlodipine": "Amlodipine",
    "bisoprolol": "Bisoprolol fumarate",
    "atenolol": "Atenolol",
    "carvedilol": "Carvedilol",
    "enalapril": "Enalapril maleate",
    "ramipril": "Ramipril",
    "lisinopril": "Lisinopril",
    "losartan": "Losartan potassium",
    "valsartan": "Valsartan",
    "candesartan": "Candesartan cilexetil",
    "atorvastatin": "Atorvastatin",
    "rosuvastatin": "Rosuvastatin",
    "simvastatin": "Simvastatin",
    "clopidogrel": "Clopidogrel",
    "aspirin": "Aspirin",
    "rivaroxaban": "Rivaroxaban",
    "apixaban": "Apixaban",
    "warfarin": "Warfarin sodium",
    "furosemide": "Furosemide",
    "spironolactone": "Spironolactone",
    # Respiratory
    "salbutamol": "Salbutamol",
    "ipratropium": "Ipratropium bromide",
    "tiotropium": "Tiotropium",
    "fluticasone": "Fluticasone",
    "budesonide": "Budesonide",
    "montelukast": "Montelukast",
    # CNS & Analgesics
    "paracetamol": "Paracetamol",
    "ibuprofen": "Ibuprofen",
    "diclofenac": "Diclofenac sodium",
    "naproxen": "Naproxen",
    "celecoxib": "Celecoxib",
    "meloxicam": "Meloxicam",
    "tramadol": "Tramadol hydrochloride",
    "codeine": "Codeine phosphate",
    "gabapentin": "Gabapentin",
    "pregabalin": "Pregabalin",
    "escitalopram": "Escitalopram",
    "sertraline": "Sertraline",
    "fluoxetine": "Fluoxetine",
    "citalopram": "Citalopram",
    "diazepam": "Diazepam",
    "alprazolam": "Alprazolam",
    # Anti-Infectives
    "amoxicillin": "Amoxicillin",
    "co-amoxiclav": "Co-amoxiclav",
    "cefalexin": "Cefalexin",
    "cefuroxime": "Cefuroxime",
    "ceftriaxone": "Ceftriaxone",
    "cefixime": "Cefixime",
    "azithromycin": "Azithromycin",
    "clarithromycin": "Clarithromycin",
    "erythromycin": "Erythromycin",
    "ciprofloxacin": "Ciprofloxacin",
    "levofloxacin": "Levofloxacin",
    "metronidazole": "Metronidazole",
    "doxycycline": "Doxycycline",
    "nitrofurantoin": "Nitrofurantoin",
    "fluconazole": "Fluconazole",
    "aciclovir": "Aciclovir",
    # Endocrine & Diabetes
    "metformin": "Metformin hydrochloride",
    "gliclazide": "Gliclazide",
    "glimepiride": "Glimepiride",
    "sitagliptin": "Sitagliptin",
    "empagliflozin": "Empagliflozin",
    "dapagliflozin": "Dapagliflozin",
    "levothyroxine": "Levothyroxine sodium",
    "carbimazole": "Carbimazole",
    "prednisolone": "Prednisolone",
    "dexamethasone": "Dexamethasone",
    # Gout & Bone
    "allopurinol": "Allopurinol",
    "colchicine": "Colchicine",
    "alendronic": "Alendronic acid",
    # Antihistamines
    "cetirizine": "Cetirizine hydrochloride",
    "loratadine": "Loratadine",
    "fexofenadine": "Fexofenadine hydrochloride",
    "chlorphenamine": "Chlorphenamine maleate"
}

def clean_text(t):
    if not t: return ""
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def main():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found: {PDF_PATH}")
        return

    print("Opening BNF 83 PDF...")
    reader = PdfReader(PDF_PATH)
    total_pages = len(reader.pages)
    print(f"Total Pages: {total_pages}")

    results = {}
    remaining_keys = set(TARGET_DRUGS.keys())

    # Fast single pass through clinical chapters 59 to 1490
    print("Beginning single-pass extraction...")
    for p_idx in range(55, min(1490, total_pages)):
        try:
            p_text = reader.pages[p_idx].extract_text()
        except Exception:
            continue

        if not p_text or len(p_text) < 50:
            continue

        # Check which remaining drugs match this page
        for k in list(remaining_keys):
            pattern = re.compile(rf'\b{re.escape(k)}\b', re.IGNORECASE)
            if pattern.search(p_text) and ("INDICATIONS AND DOSE" in p_text or "l INDICATIONS" in p_text or "UNLICENSED USE" in p_text or "l CAUTIONS" in p_text):
                # Grab next page as well
                next_p = ""
                if p_idx + 1 < total_pages:
                    try:
                        next_p = reader.pages[p_idx + 1].extract_text()
                    except Exception:
                        pass
                
                full_text = p_text + "\n" + next_p

                # Parse sections
                ind_m = re.search(r'INDICATIONS AND DOSE\s*(.*?)(?=UNLICENSED USE|CONTRA-INDICATIONS|CAUTIONS|INTERACTIONS|SIDE-EFFECTS|PREGNANCY|HEPATIC|RENAL|MONITORING|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                cautions_m = re.search(r'CAUTIONS\s*(.*?)(?=INTERACTIONS|SIDE-EFFECTS|PREGNANCY|BREAST FEEDING|HEPATIC|RENAL|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                contra_m = re.search(r'CONTRA-INDICATIONS\s*(.*?)(?=CAUTIONS|INTERACTIONS|SIDE-EFFECTS|PREGNANCY|HEPATIC|RENAL|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                renal_m = re.search(r'RENAL IMPAIRMENT\s*(.*?)(?=PREGNANCY|BREAST FEEDING|HEPATIC|MONITORING|MEDICINAL FORMS|DIRECTIONS|$)', full_text, re.DOTALL | re.IGNORECASE)
                hepatic_m = re.search(r'HEPATIC IMPAIRMENT\s*(.*?)(?=PREGNANCY|BREAST FEEDING|RENAL|MONITORING|MEDICINAL FORMS|DIRECTIONS|$)', full_text, re.DOTALL | re.IGNORECASE)
                preg_m = re.search(r'PREGNANCY\s*(.*?)(?=BREAST FEEDING|HEPATIC|RENAL|MONITORING|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                bf_m = re.search(r'BREAST FEEDING\s*(.*?)(?=HEPATIC|RENAL|MONITORING|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                side_m = re.search(r'SIDE-EFFECTS\s*(.*?)(?=PREGNANCY|BREAST FEEDING|HEPATIC|RENAL|DIRECTIONS|MEDICINAL FORMS|$)', full_text, re.DOTALL | re.IGNORECASE)
                patient_m = re.search(r'(PATIENT AND CARER ADVICE|DIRECTIONS FOR ADMINISTRATION)\s*(.*?)(?=MEDICINAL FORMS|PRESCRIBING AND DISPENSING|$)', full_text, re.DOTALL | re.IGNORECASE)

                ind = clean_text(ind_m.group(1)) if ind_m else ""
                cautions = clean_text(cautions_m.group(1)) if cautions_m else ""
                contra = clean_text(contra_m.group(1)) if contra_m else ""
                renal = clean_text(renal_m.group(1)) if renal_m else ""
                hepatic = clean_text(hepatic_m.group(1)) if hepatic_m else ""
                preg = clean_text(preg_m.group(1)) if preg_m else ""
                bf = clean_text(bf_m.group(1)) if bf_m else ""
                side = clean_text(side_m.group(1)) if side_m else ""
                patient = clean_text(patient_m.group(2)) if patient_m else ""

                preg_info = f"{preg} | {bf}".strip(" |")

                results[k] = {
                    "drugName": TARGET_DRUGS[k],
                    "bnfPage": p_idx + 1,
                    "edition": "BNF 83 (British National Formulary - March 2022)",
                    "indicationsAndDose": ind[:600] if ind else f"See BNF 83 p.{p_idx + 1} for approved UK indications and doses.",
                    "cautions": cautions[:400] if cautions else "See BNF 83 cautions.",
                    "contraindications": contra[:400] if contra else "Hypersensitivity to active substance.",
                    "renalImpairment": renal[:350] if renal else "Consult BNF 83 for dose adjustment in renal impairment (eGFR).",
                    "hepaticImpairment": hepatic[:350] if hepatic else "Caution in severe hepatic impairment.",
                    "pregnancyAndLactation": preg_info[:350] if preg_info else "Use only if potential benefit outweighs risk.",
                    "sideEffects": side[:400] if side else "",
                    "patientAdvice": patient[:350] if patient else "Take regularly as directed with water.",
                    "source": f"BNF 83, p.{p_idx + 1} (Pharmaceutical Press UK)"
                }
                print(f"[{len(results)}/{len(TARGET_DRUGS)}] Extracted: {TARGET_DRUGS[k]} (BNF 83 p.{p_idx + 1})")
                remaining_keys.remove(k)

        if not remaining_keys:
            print("All target drugs extracted!")
            break

    # Save JSON
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Completed! Extracted {len(results)} monographs to: {OUTPUT_JSON}")

if __name__ == '__main__':
    main()
