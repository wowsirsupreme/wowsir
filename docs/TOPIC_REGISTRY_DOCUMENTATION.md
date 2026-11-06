# Topic Registry Documentation
**WOW Sir — Study Corner · DPS International Ghana**
*Last updated: November 2026*

---

## Overview

The authoritative topic key registry lives in **`src/data/studyContent.ts`**.
Every `StudyChapter.key` defined there is a valid topicKey.
No other source (seed CSVs, Firestore, admin UI) may reference a topicKey that
does not exist as a chapter key in this file.

---

## Registry Structure

```
studyContent.ts
  ├── GRADE4_CHAPTERS        → gr4-ch*     (9 chapters)
  ├── GRADE5_CHAPTERS        → gr5-ch*     (9 chapters)
  ├── GRADE6_CHAPTERS        → gr6-ch*     (9 chapters)
  ├── GRADE7_CHAPTERS        → gr7-ch*     (10 chapters)
  ├── GRADE8_CHAPTERS        → gr8-ch*     (12 chapters)
  ├── GRADE9CS_CHAPTERS      → gr9-*       (15 chapters  · IGCSE CS Year 1)
  ├── IGCSE_CS_YEAR2_CHAPTERS→ gr10-*/gr11-*(13 chapters  · IGCSE CS Year 2 + revision)
  ├── IGCSE_CS_0478_CHAPTERS → (Year1 + Year2 combined, 28 chapters total)
  ├── GRADE9DT_CHAPTERS      → gr9dt-*     (15 chapters  · IGCSE D&T CC + GP option)
  └── ALCS_CHAPTERS          → alcs-*      (20 chapters  · A Level CS AS+A2)
```

---

## Complete Topic Key Table

### Grade 4 — ICT Foundations
| topicKey | Chapter Title |
|---|---|
| gr4-ch1-peripherals | Ch 1 – Computer Peripherals |
| gr4-ch2-logo | Ch 2 – Circles & Polygons in Logo |
| gr4-ch3-files | Ch 3 – Managing Files & Folders |
| gr4-ch4-desktop | Ch 4 – Personalising Your Computer |
| gr4-ch5-formatting | Ch 5 – Formatting Text |
| gr4-ch6-word | Ch 6 – Styling a Word Document |
| gr4-ch7-internet | Ch 7 – The Net Connect |
| gr4-ch8-ppt1 | Ch 8 – Creating a Presentation |
| gr4-ch9-ppt2 | Ch 9 – Designing a Presentation |

### Grade 5 — Digital Skills
| topicKey | Chapter Title |
|---|---|
| gr5-ch1-history | Ch 1 – Computer Evolution |
| gr5-ch2-storage | Ch 2 – Data Storage Media |
| gr5-ch3-tables | Ch 3 – Organising in Word |
| gr5-ch4-pptanim | Ch 4 – Enliven a Presentation |
| gr5-ch5-slideshow | Ch 5 – Slide Show Setup |
| gr5-ch6-internet | Ch 6 – Dialog on the Internet |
| gr5-ch7-multimedia | Ch 7 – Multimedia Around Us |
| gr5-ch8-scratch1 | Ch 8 – Scratch Basics |
| gr5-ch9-scratch2 | Ch 9 – Scratch Next Steps |

### Grade 6 — Spreadsheets & Coding
| topicKey | Chapter Title |
|---|---|
| gr6-ch1-robotics | Ch 1 – Robotics |
| gr6-ch2-mailmerge | Ch 2 – Create & Send Invitations |
| gr6-ch3-email | Ch 3 – Communication Using Emails |
| gr6-ch4-excel1 | Ch 4 – Create a Spreadsheet |
| gr6-ch5-excel2 | Ch 5 – Edit Cell Contents |
| gr6-ch6-excel3 | Ch 6 – Format Cell Contents |
| gr6-ch7-algorithms | Ch 7 – Algorithms & Flowcharts |
| gr6-ch8-scratch3 | Ch 8 – Scratch: More Blocks & Games |
| gr6-ch9-qb64 | Ch 9 – QB64 Basics |

### Grade 7 — Computing & Web
| topicKey | Chapter Title |
|---|---|
| gr7-ch1-numbers | Ch 1 – Number Systems |
| gr7-ch2-excel-calc | Ch 2 – Calculations in Excel |
| gr7-ch3-excel-data | Ch 3 – Analyse Data in Excel |
| gr7-ch4-excel-charts | Ch 4 – Data Representation (Charts) |
| gr7-ch5-internet | Ch 5 – Go Online |
| gr7-ch6-html1 | Ch 6 – HTML Basics |
| gr7-ch7-html2 | Ch 7 – HTML Next Steps |
| gr7-ch8-ai | Ch 8 – Artificial Intelligence |
| gr7-ch9-qb64 | Ch 9 – QB64 Next Steps |
| gr7-ch10-python | Ch 10 – Python Basics |

### Grade 8 — ICT (IGCSE ICT 0417)
| topicKey | Chapter Title |
|---|---|
| gr8-ch1-ai | Ch 1 – Artificial Intelligence |
| gr8-ch2-tech | Ch 2 – Latest Technologies & Trends |
| gr8-ch3-access1 | Ch 3 – Database Management (Access) |
| gr8-ch4-access2 | Ch 4 – Table Relationships & Queries |
| gr8-ch5-access3 | Ch 5 – Designing Forms & Reports |
| gr8-ch6-networks | Ch 6 – Communication Technology |
| gr8-ch7-google | Ch 7 – Play with Google Apps |
| gr8-ch8-malware | Ch 8 – Computer Malware |
| gr8-ch9-html-tables | Ch 9 – Website Designing: Tables |
| gr8-ch10-social | Ch 10 – Social Networking & Cyber Smart |
| gr8-ch11-troubleshoot | Ch 11 – Troubleshooting |
| gr8-ch12-python | Ch 12 – Python Next Steps |

### CS — IGCSE CS 0478 (Full 28-Chapter Syllabus)
*Year 1 (gr9-\*) + Year 2 / Revision (gr10-\*, gr11-\*) combined under class `gr9-cs`*

**Year 1 — IGCSE CS Core (Ch 1–15)**
| topicKey | Chapter Title |
|---|---|
| gr9-number-systems | Ch 1 – Number Systems & Data |
| gr9-text-sound-images | Ch 2 – Text, Sound & Images |
| gr9-compression | Ch 3 – Compression |
| gr9-cpu | Ch 4 – CPU Architecture |
| gr9-memory | Ch 5 – Memory & Storage |
| gr9-io-devices | Ch 6 – Input & Output Devices |
| gr9-os | Ch 7 – Operating Systems |
| gr9-networks | Ch 8 – Networks & the Internet |
| gr9-cybersec | Ch 9 – Cyber Security |
| gr9-data-rep | Ch 10 – Data Representation |
| gr9-algorithms | Ch 11 – Algorithms |
| gr9-programming | Ch 12 – Programming Fundamentals |
| gr9-logic | Ch 13 – Logic Gates & Circuits |
| gr9-languages | Ch 14 – Programming Languages |
| gr9-embedded | Ch 15 – Embedded Systems |

**Year 2 / Extended (Ch 16–28)**
| topicKey | Chapter Title |
|---|---|
| gr10-data-integrity | Ch 16 – Data Integrity |
| gr10-cybersecurity | Ch 17 – Cybersecurity |
| gr10-robotics | Ch 18 – Automated Systems & Robotics |
| gr10-ai | Ch 19 – Artificial Intelligence |
| gr10-algorithms | Ch 20 – Advanced Algorithm Design |
| gr10-programming | Ch 21 – Further Programming & Testing |
| gr11-security | Ch 22 – Security & Ethics (Extended) |
| gr11-oop | Ch 23 – Object-Oriented Programming |
| gr11-programming | Ch 24 – File Handling & Testing |
| gr11-databases | Ch 25 – Databases & SQL |
| gr11-data-structures | Ch 26 – Advanced Data Structures |
| gr11-algorithms | Ch 27 – Algorithms (Exam Revision) |
| gr10-quantum | Ch 28 – Quantum Computing |

### DT — IGCSE D&T 0445 / A Level D&T 9705
| topicKey | Chapter Title |
|---|---|
| gr9dt-influences | CC 1.1 – Influences on Designing |
| gr9dt-design-brief | CC 1.2 – Identifying & Defining |
| gr9dt-developing | CC 1.3 – Proposing & Developing |
| gr9dt-evaluation | CC 1.4 – Evaluating Designs |
| gr9dt-health-safety | CC 1.5 – Health & Safety |
| gr9dt-materials | CC 1.6 – Material Classification |
| gr9dt-mechanisms | CC 1.7 – Mechanisms |
| gr9dt-manufacturing | CC 1.8 – Manufacturing |
| gr9dt-communicating | CC 1.3 – Communicating Designs |
| gr9dt-structures | CC 1.6 – Structures |
| gr9dt-electronics | CC 1.8 – Electronic Systems |
| gr9dt-gp-materials | GP 3.1 – Graphic Product Materials |
| gr9dt-gp-drawing | GP 3.2 – Technical Drawing & CAD |
| gr9dt-gp-making | GP 3.3 – Making Graphic Products |
| gr9dt-gp-analysis | GP 3.4 – Analysis & Evaluation |
| gr9dt-gp-technology | GP 3.5 – Technology in Graphic Products |

### A Level CS — A Level CS 9618 (AS + A2)
| topicKey | Chapter Title | Level |
|---|---|---|
| alcs-data-rep | Ch 1 – Data Representation | AS |
| alcs-communication | Ch 2 – Communication & Internet Technologies | AS |
| alcs-hardware | Ch 3 – Hardware | AS |
| alcs-processor | Ch 4 – Processor Fundamentals | AS |
| alcs-system-software | Ch 5 – System Software | AS |
| alcs-security | Ch 6 – Security, Privacy & Data Integrity | AS |
| alcs-ethics | Ch 7 – Ethics & Ownership | AS |
| alcs-databases | Ch 8 – Databases & Data Modelling | AS |
| alcs-algorithms | Ch 9 – Algorithm Design & Problem Solving | AS |
| alcs-data-structures | Ch 10 – Data Types, Structures & Algorithms | AS |
| alcs-programming | Ch 11 – Programming | AS |
| alcs-software-dev | Ch 12 – Software Development | AS |
| alcs-adv-data-rep | Ch 13 – Further Data Representation | A2 |
| alcs-adv-internet | Ch 14 – Further Communication & Internet | A2 |
| alcs-adv-hardware | Ch 15 – Further Hardware | A2 |
| alcs-adv-system | Ch 16 – System Software & Virtual Machines | A2 |
| alcs-adv-security | Ch 17 – Cryptography & Network Security | A2 |
| alcs-ai | Ch 18 – Artificial Intelligence | A2 |
| alcs-adv-algorithms | Ch 19 – Further Algorithm Design & Complexity | A2 |
| alcs-adv-programming | Ch 20 – Computational Intelligence & Paradigms | A2 |

---

## Class → topicKey Namespace Map

| classId | Label | Paper | Namespace(s) | Chapters |
|---|---|---|---|---|
| gr4-cs | Grade 4 | ICT Foundations | gr4-ch* | 9 |
| gr5-cs | Grade 5 | Digital Skills | gr5-ch* | 9 |
| gr6-cs | Grade 6 | Spreadsheets & Coding | gr6-ch* | 9 |
| gr7-cs | Grade 7 | Computing & Web | gr7-ch* | 10 |
| gr8-cs | ICT | IGCSE ICT 0417 | gr8-ch* | 12 |
| gr9-cs | CS | IGCSE CS 0478 | gr9-*, gr10-*, gr11-security/oop/programming/databases/data-structures/algorithms | 28 |
| gr9-dt | DT | D&T 0445 / 9705 | gr9dt-* | 15+1 (16) |
| gr11-cs | A Level CS | A Level CS 9618 | alcs-* | 20 |

> **Note:** `gr10-cs` is a backward-compatibility alias only. It maps to the same
> 28-chapter `IGCSE_CS_0478_CHAPTERS` array as `gr9-cs`. It does not appear in
> the CLASSES array and is invisible to students.

---

## Validation Rules

1. **Every seed CSV row** must have a `topicKey` that matches a `.key` in `studyContent.ts`.
2. **No topicKey may contain spaces** — use hyphens.
3. **Year groupings are not topicKey namespaces** — `gr10-*` and `gr11-*` keys
   belong to the IGCSE CS 0478 syllabus, not to separate papers.
4. **A Level CS keys** use the `alcs-` prefix exclusively — never `gr11-` for A Level content.
