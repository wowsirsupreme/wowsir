# Paper and Syllabus Structure
**WOW Sir — Study Corner · DPS International Ghana**
*Last updated: November 2026*

---

## Core Principle

> **A paper code represents the complete syllabus for one examination.**
> Year 1 / Year 2 / Year 3 are teaching-progression labels, not separate papers.

---

## Paper → Class Mapping

| Cambridge Code | Exam Board | Subject | App classId | App Label |
|---|---|---|---|---|
| 0417 | CAIE IGCSE | Information & Communication Technology | `gr8-cs` | ICT |
| 0445 / 9705 | CAIE IGCSE / A Level | Design & Technology | `gr9-dt` | DT |
| 0478 | CAIE IGCSE | Computer Science | `gr9-cs` | CS |
| 9618 | CAIE A Level | Computer Science | `gr11-cs` | A Level CS |

Lower-school classes (Grade 4–7) follow the school's own curriculum and do not
map to Cambridge paper codes.

---

## IGCSE CS 0478 Structure

```
Paper: IGCSE CS 0478
└── Class: gr9-cs  (label: "CS")
    ├── Teaching Year 1  (Ch 1–15, gr9-* keys)
    │   ├── Ch 1  gr9-number-systems
    │   ├── Ch 2  gr9-text-sound-images
    │   ├── Ch 3  gr9-compression
    │   ├── Ch 4  gr9-cpu
    │   ├── Ch 5  gr9-memory
    │   ├── Ch 6  gr9-io-devices
    │   ├── Ch 7  gr9-os
    │   ├── Ch 8  gr9-networks
    │   ├── Ch 9  gr9-cybersec
    │   ├── Ch 10 gr9-data-rep
    │   ├── Ch 11 gr9-algorithms
    │   ├── Ch 12 gr9-programming
    │   ├── Ch 13 gr9-logic
    │   ├── Ch 14 gr9-languages
    │   └── Ch 15 gr9-embedded
    └── Teaching Year 2  (Ch 16–28, gr10-* and gr11-revision keys)
        ├── Ch 16 gr10-data-integrity
        ├── Ch 17 gr10-cybersecurity
        ├── Ch 18 gr10-robotics
        ├── Ch 19 gr10-ai
        ├── Ch 20 gr10-algorithms
        ├── Ch 21 gr10-programming
        ├── Ch 22 gr11-security
        ├── Ch 23 gr11-oop
        ├── Ch 24 gr11-programming
        ├── Ch 25 gr11-databases
        ├── Ch 26 gr11-data-structures
        ├── Ch 27 gr11-algorithms
        └── Ch 28 gr10-quantum
```

> **Historical note:** Before November 2026 the app split 0478 into two
> separate classes (`gr9-cs` for Year 1 and `gr10-cs` for Year 2). This was
> incorrect. Both classes now resolve to the same 28-chapter
> `IGCSE_CS_0478_CHAPTERS` array. The `gr10-cs` classId is kept only as a
> backward-compatibility alias in `GRADE_CHAPTERS`; it is hidden from students.

---

## IGCSE D&T 0445 / A Level D&T 9705 Structure

```
Papers: IGCSE D&T 0445 (Gr 9/10)  +  A Level D&T 9705 (Gr 11)
└── Class: gr9-dt  (label: "DT")
    ├── Common Content (CC 1.1–1.8)
    │   ├── gr9dt-influences      CC 1.1 – Influences on Designing
    │   ├── gr9dt-design-brief    CC 1.2 – Identifying & Defining
    │   ├── gr9dt-developing      CC 1.3 – Proposing & Developing
    │   ├── gr9dt-evaluation      CC 1.4 – Evaluating Designs
    │   ├── gr9dt-health-safety   CC 1.5 – Health & Safety
    │   ├── gr9dt-materials       CC 1.6 – Material Classification
    │   ├── gr9dt-mechanisms      CC 1.7 – Mechanisms
    │   ├── gr9dt-manufacturing   CC 1.8 – Manufacturing
    │   ├── gr9dt-communicating   CC 1.3 – Communicating Designs
    │   ├── gr9dt-structures      CC 1.6 – Structures
    │   └── gr9dt-electronics     CC 1.8 – Electronic Systems
    └── Graphic Products Option (GP 3.1–3.5)
        ├── gr9dt-gp-materials    GP 3.1 – Graphic Product Materials
        ├── gr9dt-gp-drawing      GP 3.2 – Technical Drawing & CAD
        ├── gr9dt-gp-making       GP 3.3 – Making Graphic Products
        ├── gr9dt-gp-analysis     GP 3.4 – Analysis & Evaluation
        └── gr9dt-gp-technology   GP 3.5 – Technology in Graphic Products
```

---

## A Level CS 9618 Structure

```
Paper: A Level CS 9618
└── Class: gr11-cs  (label: "A Level CS")
    ├── AS Level  (Ch 1–12, alcs-* keys)
    │   ├── Ch 1  alcs-data-rep
    │   ├── Ch 2  alcs-communication
    │   ├── Ch 3  alcs-hardware
    │   ├── Ch 4  alcs-processor
    │   ├── Ch 5  alcs-system-software
    │   ├── Ch 6  alcs-security
    │   ├── Ch 7  alcs-ethics
    │   ├── Ch 8  alcs-databases
    │   ├── Ch 9  alcs-algorithms
    │   ├── Ch 10 alcs-data-structures
    │   ├── Ch 11 alcs-programming
    │   └── Ch 12 alcs-software-dev
    └── A2 Level  (Ch 13–20, alcs-adv-* and alcs-ai keys)
        ├── Ch 13 alcs-adv-data-rep
        ├── Ch 14 alcs-adv-internet
        ├── Ch 15 alcs-adv-hardware
        ├── Ch 16 alcs-adv-system
        ├── Ch 17 alcs-adv-security
        ├── Ch 18 alcs-ai
        ├── Ch 19 alcs-adv-algorithms
        └── Ch 20 alcs-adv-programming
```

---

## What Must NOT Happen

| ❌ Wrong | ✅ Correct |
|---|---|
| `gr9-cs` = Year 1 of 0478; `gr10-cs` = Year 2 of 0478 | `gr9-cs` = complete 0478 (28 ch) |
| A separate class per exam year | Teaching years are labels within one class |
| `gr11-*` topicKeys for A Level CS | `alcs-*` topicKeys for A Level CS |
| Seeds with topicKeys not in `studyContent.ts` | All seed topicKeys validated against registry |
