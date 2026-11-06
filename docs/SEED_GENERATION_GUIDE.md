# Seed Generation Guide
**WOW Sir — Study Corner · DPS International Ghana**
*Last updated: November 2026*

---

## What Seeds Are

Seed CSV files are batches of MCQ questions that can be imported into Firebase
via the admin panel at `wowsir.vercel.app/admin`.
Each row is one question. The `topicKey` column links the question to a chapter
in the app's registry (`studyContent.ts`).

---

## Seed CSV Format

```
id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,explanation,difficulty,points,chapter,imageUrl
```

| Field | Description | Example |
|---|---|---|
| id | Unique string; use `uuid` or `<topicKey>-q001` | `gr9-networks-q001` |
| topicKey | **Must match a chapter key in `studyContent.ts`** | `gr9-networks` |
| type | Always `mcq` | `mcq` |
| text | Question text | `Which protocol assigns IP addresses?` |
| optionA–D | Four answer choices | `DHCP` |
| answer | 0-based index of correct option (0=A, 1=B, 2=C, 3=D) | `0` |
| explanation | Explanation shown after answering | `DHCP dynamically assigns…` |
| difficulty | `easy`, `medium`, or `hard` | `medium` |
| points | Usually 1 | `1` |
| chapter | Human-readable chapter name (display only) | `Networks` |
| imageUrl | URL to an image, or leave blank | |

---

## Mandatory Pre-Generation Checklist

Before generating any seed CSV:

1. **Open `src/data/studyContent.ts`** and find the chapter array for the target class.
2. **List every `key` in that array** — these are the only valid topicKeys for seeds.
3. **Confirm the class exists in `studyClasses.ts`** (the CLASSES array).
4. **Never invent topicKeys** — if a topic does not have a chapter key in
   `studyContent.ts`, add it there first, commit, then write seeds.

---

## topicKey Namespaces by Class

| classId | Valid topicKey prefixes |
|---|---|
| gr4-cs | `gr4-ch*` |
| gr5-cs | `gr5-ch*` |
| gr6-cs | `gr6-ch*` |
| gr7-cs | `gr7-ch*` |
| gr8-cs | `gr8-ch*` |
| gr9-cs | `gr9-*`, `gr10-*`, `gr11-security`, `gr11-oop`, `gr11-programming`, `gr11-databases`, `gr11-data-structures`, `gr11-algorithms` |
| gr9-dt | `gr9dt-*` |
| gr11-cs | `alcs-*` |

---

## Existing Seed Files

| File | Paper | Questions | Key namespaces |
|---|---|---|---|
| `scripts/seed/0417_ict_gr8_mcq.csv` | IGCSE ICT 0417 | 67 | gr8-ch* |
| `scripts/seed/0445_dt_mcq.csv` | IGCSE D&T 0445 | 50 | gr9dt-* |
| `scripts/seed/9705_dt_mcq.csv` | A Level D&T 9705 | 57 | gr9dt-* |
| `scripts/seed/0478_cs_data_rep_mcq.csv` | IGCSE CS 0478 | 96 | gr9-number-systems, gr9-text-sound-images, gr9-data-rep, gr9-compression |
| `scripts/seed/0478_cs_networking_logic_mcq.csv` | IGCSE CS 0478 | 89 | gr9-networks, gr9-logic, gr9-programming, gr9-algorithms, gr9-cybersec |
| `scripts/seed/0478_cs_grade10_mcq.csv` | IGCSE CS 0478 | 114 | gr10-algorithms, gr10-programming, gr10-robotics, gr10-data-integrity, gr10-cybersecurity, gr10-ai, gr10-quantum, gr9-logic, gr11-security, gr11-databases |
| `scripts/seed/9618_cs_grade11_mcq.csv` | A Level CS 9618 | 84 | alcs-hardware, alcs-system-software, alcs-programming, alcs-data-rep, alcs-communication, alcs-processor, alcs-ai, alcs-data-structures, alcs-databases, alcs-security, alcs-algorithms |

---

## Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---|---|---|
| Using `gr11-*` keys for A Level CS seeds | Questions orphaned — no chapter found | Use `alcs-*` keys for all A Level CS content |
| Using `gr10-cs` as a class in seeds | No such class in CLASSES array | Use `gr9-cs` — it covers the full 0478 syllabus |
| Creating topicKeys that don't exist in studyContent.ts | Questions appear in DB but never load in the app | Always validate topicKeys against studyContent.ts before generating |
| Using `gr9-internet` or `gr9-networking` | These keys do not exist | Use `gr9-networks` |
| Using `gr9dt-plan` or `gr9dt-making` | These keys do not exist | Use `gr9dt-developing` and `gr9dt-gp-making` respectively |
| Using `gr9dt-communication` (no -ing) | This key does not exist | Use `gr9dt-communicating` |

---

## Validation Script

Run this after creating or editing a seed CSV to verify all topicKeys exist:

```python
#!/usr/bin/env python3
"""
Validate seed CSV topicKeys against studyContent.ts chapter keys.
Usage: python3 scripts/validate_seeds.py
"""
import csv, re, sys
from pathlib import Path

# Extract all chapter keys from studyContent.ts
content_file = Path("src/data/studyContent.ts")
text = content_file.read_text()
valid_keys = set(re.findall(r"key:\s*'([^']+)'", text))

errors = []
for csv_file in Path("scripts/seed").glob("*.csv"):
    with open(csv_file) as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, 2):
            tk = row.get("topicKey", "").strip()
            if tk and tk not in valid_keys:
                errors.append(f"{csv_file.name}:{i} → unknown topicKey '{tk}'")

if errors:
    print("VALIDATION FAILED:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
else:
    print("All seed topicKeys are valid.")
```

---

## Import Process

1. Go to `wowsir.vercel.app/admin` (password: see admin credentials)
2. Navigate to **Question Bank → Import CSV**
3. Upload the seed CSV
4. The importer will reject rows whose `topicKey` is not in Firestore's chapter registry
5. Check the import report for any skipped rows
