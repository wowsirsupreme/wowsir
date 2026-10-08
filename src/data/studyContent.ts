/**
 * WOW Sir — Study Content
 * DPS International Ghana · Grades 4–9
 *
 * Chapter keys match the topicKey used in the question bank (src/data/grades/*.ts)
 * so questions load correctly when a chapter is selected.
 *
 * Questions and flashcards start empty — they are loaded from the question bank
 * at runtime via getChapterQuestions() / getChapterFlashcards().
 */

import type { Question } from '@/types/question';
import { CHAPTER_RESOURCES } from './studyResources';

/* ── Flashcard (study-only, not in Firestore question bank) ── */
export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example?: string;
  chapterKey: string;
}

/* ── Chapter Resource ── */
export interface ChapterKeyword {
  term: string;
  definition: string;
}

export interface ChapterResource {
  keywords?: ChapterKeyword[];
  notes?: string[];          // bullet-point notes
  mindmapUrl?: string;       // URL to an image/PDF mindmap
  mindmapAlt?: string;
}

/* ── Chapter metadata ── */
export interface StudyChapter {
  key: string;
  title: string;
  shortTitle: string;
  description: string;
  questions: Question[];
  flashcards: Flashcard[];
  resources?: ChapterResource;
}

/* ── Practice Test definition ── */
export interface PracticeTest {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  chapterKeys: string[];
  maxQuestions: number;
}

/* ── Per-grade content map ── */
export interface GradeStudyContent {
  classId: string;
  chapters: StudyChapter[];
  practiceTests: PracticeTest[];
}

/* ══════════════════════════════════════════════════════
   GRADE 4  (9 chapters)
   ══════════════════════════════════════════════════════ */
const GRADE4_CHAPTERS: StudyChapter[] = [
  { key: 'gr4-ch1-peripherals', shortTitle: 'Computer Peripherals',         title: 'Ch 1 – Computer Peripherals',          description: 'Input and output devices, how peripherals connect to a computer.',            questions: [], flashcards: [] },
  { key: 'gr4-ch2-logo',        shortTitle: 'Logo Programming',              title: 'Ch 2 – Circles & Polygons in Logo',    description: 'Drawing shapes with Logo commands, angles and repeat loops.',                questions: [], flashcards: [] },
  { key: 'gr4-ch3-files',       shortTitle: 'Files & Folders',               title: 'Ch 3 – Managing Files & Folders',      description: 'Creating, renaming, moving and organising files on a computer.',             questions: [], flashcards: [] },
  { key: 'gr4-ch4-desktop',     shortTitle: 'Personalising Desktop',         title: 'Ch 4 – Personalising Your Computer',   description: 'Changing desktop settings, wallpapers, screen savers and accessibility.',    questions: [], flashcards: [] },
  { key: 'gr4-ch5-formatting',  shortTitle: 'Formatting Text',               title: 'Ch 5 – Formatting Text',               description: 'Font, size, bold, italic, underline and paragraph formatting in Word.',      questions: [], flashcards: [] },
  { key: 'gr4-ch6-word',        shortTitle: 'Styling Documents',             title: 'Ch 6 – Styling a Word Document',       description: 'Headers, footers, borders, page layout and inserting images.',               questions: [], flashcards: [] },
  { key: 'gr4-ch7-internet',    shortTitle: 'The Internet',                  title: 'Ch 7 – The Net Connect',               description: 'Browsing the web, search engines, URLs and online safety basics.',           questions: [], flashcards: [] },
  { key: 'gr4-ch8-ppt1',        shortTitle: 'Create a Presentation',         title: 'Ch 8 – Creating a Presentation',       description: 'PowerPoint basics: slides, layouts, text boxes and themes.',                 questions: [], flashcards: [] },
  { key: 'gr4-ch9-ppt2',        shortTitle: 'Design a Presentation',         title: 'Ch 9 – Designing a Presentation',      description: 'Adding visuals, transitions and printing a presentation.',                   questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 5  (9 chapters)
   ══════════════════════════════════════════════════════ */
const GRADE5_CHAPTERS: StudyChapter[] = [
  { key: 'gr5-ch1-history',     shortTitle: 'Computer Evolution',            title: 'Ch 1 – Computer Evolution',            description: 'History of computers from early machines to modern devices.',                questions: [], flashcards: [] },
  { key: 'gr5-ch2-storage',     shortTitle: 'Data Storage Media',            title: 'Ch 2 – Data Storage Media',            description: 'Types of storage: HDD, SSD, USB, optical discs and cloud storage.',          questions: [], flashcards: [] },
  { key: 'gr5-ch3-tables',      shortTitle: 'Organising in Word',            title: 'Ch 3 – Organising in Word',            description: 'Creating and formatting tables in Microsoft Word.',                         questions: [], flashcards: [] },
  { key: 'gr5-ch4-pptanim',     shortTitle: 'Enliven a Presentation',        title: 'Ch 4 – Enliven a Presentation',        description: 'Animations, custom effects and multimedia in PowerPoint.',                   questions: [], flashcards: [] },
  { key: 'gr5-ch5-slideshow',   shortTitle: 'Slide Show Setup',              title: 'Ch 5 – Slide Show Setup',              description: 'Timings, rehearsal, presenter view and kiosk mode.',                        questions: [], flashcards: [] },
  { key: 'gr5-ch6-internet',    shortTitle: 'Dialog on the Internet',        title: 'Ch 6 – Dialog on the Internet',        description: 'Email, online communication tools and internet safety.',                     questions: [], flashcards: [] },
  { key: 'gr5-ch7-multimedia',  shortTitle: 'Multimedia Around Us',          title: 'Ch 7 – Multimedia Around Us',          description: 'Text, images, audio, video and interactivity in digital media.',             questions: [], flashcards: [] },
  { key: 'gr5-ch8-scratch1',    shortTitle: 'Scratch Basics',                title: 'Ch 8 – Scratch Basics',                description: 'Sprites, costumes, events and basic motion in Scratch.',                     questions: [], flashcards: [] },
  { key: 'gr5-ch9-scratch2',    shortTitle: 'Scratch Next Steps',            title: 'Ch 9 – Scratch Next Steps',            description: 'Variables, loops, conditions and simple games in Scratch.',                  questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 6  (9 chapters)
   ══════════════════════════════════════════════════════ */
const GRADE6_CHAPTERS: StudyChapter[] = [
  { key: 'gr6-ch1-robotics',    shortTitle: 'Robotics',                      title: 'Ch 1 – Robotics',                      description: 'Introduction to robots, sensors, actuators and programming robots.',          questions: [], flashcards: [] },
  { key: 'gr6-ch2-mailmerge',   shortTitle: 'Create & Send Invitations',     title: 'Ch 2 – Create & Send Invitations',     description: 'Mail merge in Word: connecting data sources and printing letters.',           questions: [], flashcards: [] },
  { key: 'gr6-ch3-email',       shortTitle: 'Communication via Email',       title: 'Ch 3 – Communication Using Emails',    description: 'Email structure, etiquette, attachments and organising your inbox.',          questions: [], flashcards: [] },
  { key: 'gr6-ch4-excel1',      shortTitle: 'Create a Spreadsheet',          title: 'Ch 4 – Create a Spreadsheet',          description: 'Excel basics: entering data, simple formulas and cell references.',            questions: [], flashcards: [] },
  { key: 'gr6-ch5-excel2',      shortTitle: 'Edit Cell Contents',            title: 'Ch 5 – Edit Cell Contents',            description: 'Editing, copying, moving cells and using AutoFill in Excel.',                  questions: [], flashcards: [] },
  { key: 'gr6-ch6-excel3',      shortTitle: 'Format Cell Contents',          title: 'Ch 6 – Format Cell Contents',          description: 'Number formats, borders, colours, merging and conditional formatting.',        questions: [], flashcards: [] },
  { key: 'gr6-ch7-algorithms',  shortTitle: 'Algorithms & Flowcharts',       title: 'Ch 7 – Algorithms & Flowcharts',       description: 'Decomposition, sequence, selection, iteration and flowchart symbols.',         questions: [], flashcards: [] },
  { key: 'gr6-ch8-scratch3',    shortTitle: 'Scratch: Games',                title: 'Ch 8 – Scratch: More Blocks & Games',  description: 'Advanced Scratch: clones, broadcasts, lists and multi-sprite games.',          questions: [], flashcards: [] },
  { key: 'gr6-ch9-qb64',        shortTitle: 'QB64 Basics',                   title: 'Ch 9 – QB64 Basics',                   description: 'Introduction to QB64: PRINT, INPUT, variables and simple programs.',           questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 7  (10 chapters)
   ══════════════════════════════════════════════════════ */
const GRADE7_CHAPTERS: StudyChapter[] = [
  { key: 'gr7-ch1-numbers',     shortTitle: 'Number Systems',                title: 'Ch 1 – Number Systems',                description: 'Binary, denary, hexadecimal and converting between bases.',                   questions: [], flashcards: [] },
  { key: 'gr7-ch2-excel-calc',  shortTitle: 'Calculations in Excel',         title: 'Ch 2 – Calculations in Excel',         description: 'SUM, AVERAGE, MAX, MIN and formula writing in Excel.',                      questions: [], flashcards: [] },
  { key: 'gr7-ch3-excel-data',  shortTitle: 'Analyse Data in Excel',         title: 'Ch 3 – Analyse Data in Excel',         description: 'Sorting, filtering, lookup functions and data validation.',                   questions: [], flashcards: [] },
  { key: 'gr7-ch4-charts',      shortTitle: 'Data Representation',           title: 'Ch 4 – Data Representation (Charts)', description: 'Bar, line, pie and scatter charts; choosing the right chart type.',           questions: [], flashcards: [] },
  { key: 'gr7-ch5-internet',    shortTitle: 'Go Online',                     title: 'Ch 5 – Go Online',                     description: 'How the internet works: ISP, protocols, DNS and IP addresses.',               questions: [], flashcards: [] },
  { key: 'gr7-ch6-html1',       shortTitle: 'HTML Basics',                   title: 'Ch 6 – HTML Basics',                   description: 'HTML tags, headings, paragraphs, links and images.',                         questions: [], flashcards: [] },
  { key: 'gr7-ch7-html2',       shortTitle: 'HTML Next Steps',               title: 'Ch 7 – HTML Next Steps',               description: 'Lists, tables, forms and basic inline CSS styling.',                          questions: [], flashcards: [] },
  { key: 'gr7-ch8-ai',          shortTitle: 'Artificial Intelligence',       title: 'Ch 8 – Artificial Intelligence',       description: 'What AI is, machine learning, everyday AI applications and ethics.',          questions: [], flashcards: [] },
  { key: 'gr7-ch9-qb64',        shortTitle: 'QB64 Next Steps',               title: 'Ch 9 – QB64 Next Steps',               description: 'Conditionals (IF/ELSE), loops (FOR/WHILE) and subroutines in QB64.',           questions: [], flashcards: [] },
  { key: 'gr7-ch10-python',     shortTitle: 'Python Basics',                 title: 'Ch 10 – Python Basics',                description: 'Variables, data types, input/output and basic Python programs.',                questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 8  (12 chapters)
   ══════════════════════════════════════════════════════ */
const GRADE8_CHAPTERS: StudyChapter[] = [
  { key: 'gr8-ch1-ai',          shortTitle: 'Artificial Intelligence',       title: 'Ch 1 – Artificial Intelligence',       description: 'Deep learning, neural networks, AI ethics and real-world applications.',      questions: [], flashcards: [] },
  { key: 'gr8-ch2-cybersafety', shortTitle: 'Cyber Safety',                  title: 'Ch 2 – Cyber Safety',                  description: 'Threats, phishing, social engineering, passwords and safe browsing.',         questions: [], flashcards: [] },
  { key: 'gr8-ch3-excel-adv',   shortTitle: 'Advanced Excel',                title: 'Ch 3 – Advanced Excel',                description: 'PivotTables, VLOOKUP, IF functions and data analysis tools.',                 questions: [], flashcards: [] },
  { key: 'gr8-ch4-networks',    shortTitle: 'Networks',                      title: 'Ch 4 – Communication Technology',      description: 'LAN, WAN, topologies, protocols and network hardware.',                      questions: [], flashcards: [] },
  { key: 'gr8-ch5-database',    shortTitle: 'Database Management',           title: 'Ch 5 – Database Management (Access)', description: 'Tables, queries, forms and reports in Microsoft Access.',                    questions: [], flashcards: [] },
  { key: 'gr8-ch6-css',         shortTitle: 'CSS Styling',                   title: 'Ch 6 – CSS Styling',                   description: 'Selectors, properties, the box model and responsive design.',                 questions: [], flashcards: [] },
  { key: 'gr8-ch7-python-sel',  shortTitle: 'Python: Selection',             title: 'Ch 7 – Python: Selection',             description: 'if, elif, else statements and Boolean logic in Python.',                     questions: [], flashcards: [] },
  { key: 'gr8-ch8-python-loops',shortTitle: 'Python: Loops',                 title: 'Ch 8 – Python: Loops',                 description: 'for and while loops, range(), break and continue.',                          questions: [], flashcards: [] },
  { key: 'gr8-ch9-python-func', shortTitle: 'Python: Functions',             title: 'Ch 9 – Python: Functions',             description: 'Defining functions, parameters, return values and scope.',                    questions: [], flashcards: [] },
  { key: 'gr8-ch10-python-lists',shortTitle: 'Python: Lists',                title: 'Ch 10 – Python: Lists',                description: 'Lists, indexing, slicing, list methods and iteration.',                       questions: [], flashcards: [] },
  { key: 'gr8-ch11-ppt-adv',    shortTitle: 'Advanced PowerPoint',           title: 'Ch 11 – Advanced PowerPoint',          description: 'Master slides, custom animations, embedding video and presenting.',            questions: [], flashcards: [] },
  { key: 'gr8-ch12-python-proj',shortTitle: 'Python Project',                title: 'Ch 12 – Python Project',               description: 'Applying Python skills: a complete mini-project from plan to code.',          questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 9 CS  (15 chapters · IGCSE 0478 Year 1)
   ══════════════════════════════════════════════════════ */
const GRADE9CS_CHAPTERS: StudyChapter[] = [
  { key: 'gr9-number-systems',  shortTitle: 'Number Systems & Data',         title: 'Ch 1 – Number Systems & Data',         description: 'Binary, denary, hexadecimal; converting between bases and two\'s complement.',questions: [], flashcards: [],
    resources: {
      keywords: [
        { term: 'Binary', definition: 'Base-2 number system using only digits 0 and 1. Used internally by all computers.' },
        { term: 'Denary', definition: 'Base-10 number system (0–9) — the everyday number system humans use.' },
        { term: 'Hexadecimal', definition: 'Base-16 number system using digits 0–9 and letters A–F. Used as a shorthand for binary.' },
        { term: 'Bit', definition: 'The smallest unit of data — a single binary digit, either 0 or 1.' },
        { term: 'Byte', definition: 'A group of 8 bits. Can store values from 0 to 255 in binary.' },
        { term: "Two's complement", definition: 'A method of representing negative numbers in binary by inverting all bits and adding 1.' },
        { term: 'Overflow', definition: 'Occurs when a calculation produces a result too large to store in the available number of bits.' },
        { term: 'Binary shift', definition: 'Moving all bits left or right. Left shift multiplies by 2; right shift divides by 2.' },
      ],
      notes: [
        'To convert denary to binary: repeatedly divide by 2 and record remainders from bottom to top.',
        'To convert binary to denary: multiply each bit by its place value (1, 2, 4, 8, 16…) and add up.',
        'Hexadecimal digits A=10, B=11, C=12, D=13, E=14, F=15.',
        'One hex digit = 4 binary bits (a nibble). Two hex digits = 1 byte.',
        "Two's complement: flip all bits, then add 1. The leading bit is the sign bit (1 = negative).",
        'A left binary shift of n places multiplies the value by 2ⁿ.',
        'A right binary shift of n places divides the value by 2ⁿ (integer division).',
        'Overflow happens when the result of an operation exceeds the maximum storable value for the bit width.',
      ],
    },
  },
  { key: 'gr9-text-sound-images',shortTitle: 'Text, Sound & Images',         title: 'Ch 2 – Text, Sound & Images',          description: 'ASCII, Unicode, sound sampling, bitmap images and colour depth.',             questions: [], flashcards: [] },
  { key: 'gr9-compression',     shortTitle: 'Compression',                   title: 'Ch 3 – Compression',                   description: 'Lossy vs lossless, run-length encoding (RLE) and Huffman coding.',             questions: [], flashcards: [] },
  { key: 'gr9-cpu',             shortTitle: 'CPU Architecture',              title: 'Ch 4 – CPU Architecture',              description: 'CPU components: ALU, CU, registers, buses and the fetch-decode-execute cycle.',questions: [], flashcards: [] },
  { key: 'gr9-memory',          shortTitle: 'Memory & Storage',              title: 'Ch 5 – Memory & Storage',              description: 'RAM, ROM, cache, primary and secondary storage types.',                        questions: [], flashcards: [] },
  { key: 'gr9-io-devices',      shortTitle: 'I/O Devices',                   title: 'Ch 6 – Input & Output Devices',        description: 'Categories of input and output devices and their uses.',                      questions: [], flashcards: [] },
  { key: 'gr9-os',              shortTitle: 'Operating Systems',             title: 'Ch 7 – Operating Systems',             description: 'OS roles: memory management, multitasking, file systems and user interface.',  questions: [], flashcards: [] },
  { key: 'gr9-networks',        shortTitle: 'Networks',                      title: 'Ch 8 – Networks & the Internet',       description: 'LAN, WAN, topologies, protocols, IP addresses and the web.',                  questions: [], flashcards: [] },
  { key: 'gr9-cybersec',        shortTitle: 'Cyber Security',                title: 'Ch 9 – Cyber Security',                description: 'Threats: malware, phishing, brute force; protection methods.',                  questions: [], flashcards: [] },
  { key: 'gr9-data-rep',        shortTitle: 'Data Representation',           title: 'Ch 10 – Data Representation',          description: 'Binary arithmetic, overflow, shifts and hexadecimal conversions.',             questions: [], flashcards: [] },
  { key: 'gr9-algorithms',      shortTitle: 'Algorithms',                    title: 'Ch 11 – Algorithms',                   description: 'Pseudocode, flowcharts, searching and sorting algorithms.',                   questions: [], flashcards: [] },
  { key: 'gr9-programming',     shortTitle: 'Programming Fundamentals',      title: 'Ch 12 – Programming Fundamentals',     description: 'Variables, data types, sequence, selection and iteration in pseudocode.',      questions: [], flashcards: [] },
  { key: 'gr9-logic',           shortTitle: 'Logic Gates',                   title: 'Ch 13 – Logic Gates & Circuits',       description: 'AND, OR, NOT, NAND, NOR, XOR gates and truth tables.',                        questions: [], flashcards: [] },
  { key: 'gr9-languages',       shortTitle: 'Programming Languages',         title: 'Ch 14 – Programming Languages',        description: 'High-level vs low-level languages, compilers, interpreters and assemblers.',   questions: [], flashcards: [] },
  { key: 'gr9-embedded',        shortTitle: 'Embedded Systems',              title: 'Ch 15 – Embedded Systems',             description: 'Dedicated microcontrollers, sensors and real-world embedded applications.',    questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   GRADE 9 DT  (8 chapters · IGCSE D&T 0445 Common Content)
   ══════════════════════════════════════════════════════ */
const GRADE9DT_CHAPTERS: StudyChapter[] = [
  { key: 'gr9dt-influences',    shortTitle: 'Influences on Designing',       title: 'CC 1.1 – Influences on Designing',     description: 'Cultural, social, economic and environmental influences on product design.',   questions: [], flashcards: [] },
  { key: 'gr9dt-design-brief',  shortTitle: 'Identifying & Defining',        title: 'CC 1.2 – Identifying & Defining',      description: 'Design brief, research, specification and target user.',                      questions: [], flashcards: [] },
  { key: 'gr9dt-developing',    shortTitle: 'Proposing & Developing',        title: 'CC 1.3 – Proposing & Developing',      description: 'Generating ideas, developing concepts and annotated sketches.',                questions: [], flashcards: [] },
  { key: 'gr9dt-evaluation',    shortTitle: 'Evaluating Designs',            title: 'CC 1.4 – Evaluating Designs',          description: 'Testing against a specification, feedback and iterative design.',               questions: [], flashcards: [] },
  { key: 'gr9dt-health-safety', shortTitle: 'Health & Safety',               title: 'CC 1.5 – Health & Safety',             description: 'Workshop safety rules, PPE, risk assessment and safe tool use.',               questions: [], flashcards: [] },
  { key: 'gr9dt-materials',     shortTitle: 'Material Classification',       title: 'CC 1.6 – Material Classification',     description: 'Properties of materials: woods, metals, polymers, textiles and composites.',   questions: [], flashcards: [] },
  { key: 'gr9dt-mechanisms',    shortTitle: 'Mechanisms',                    title: 'CC 1.7 – Mechanisms',                  description: 'Levers, gears, cams, pulleys and mechanical advantage.',                      questions: [], flashcards: [] },
  { key: 'gr9dt-manufacturing', shortTitle: 'Manufacturing',                 title: 'CC 1.8 – Manufacturing',               description: 'Cutting, shaping, joining, finishing and scales of production.',               questions: [], flashcards: [] },
];

/* ══════════════════════════════════════════════════════
   LEGACY export (Grade 7 only) — kept for backward compatibility
   with /study/[classId]/[mode]/page.tsx
   ══════════════════════════════════════════════════════ */
export const STUDY_CHAPTERS: StudyChapter[] = GRADE7_CHAPTERS;

/* ── Merge resource data into chapters ────────────────────
   Chapters that already have inline resources (e.g. gr9-number-systems)
   keep them; all others get their data from CHAPTER_RESOURCES.
   ─────────────────────────────────────────────────────── */
function applyResources(chapters: StudyChapter[]): StudyChapter[] {
  return chapters.map(ch => ({
    ...ch,
    resources: ch.resources ?? CHAPTER_RESOURCES[ch.key],
  }));
}

const ALL_CHAPTER_ARRAYS = [
  GRADE4_CHAPTERS, GRADE5_CHAPTERS, GRADE6_CHAPTERS,
  GRADE7_CHAPTERS, GRADE8_CHAPTERS,
  GRADE9CS_CHAPTERS, GRADE9DT_CHAPTERS,
];
ALL_CHAPTER_ARRAYS.forEach(arr => arr.forEach((ch, i, a) => {
  const res = ch.resources ?? CHAPTER_RESOURCES[ch.key];
  /* Auto-generate flashcards from keywords when the chapter has none */
  const flashcards: Flashcard[] = ch.flashcards.length > 0
    ? ch.flashcards
    : (res?.keywords ?? []).map((kw, j) => ({
        id: `${ch.key}-fc-${j}`,
        term: kw.term,
        definition: kw.definition,
        chapterKey: ch.key,
      }));
  a[i] = { ...ch, resources: res, flashcards };
}));

/* ── Grade → chapters map ── */
export const GRADE_CHAPTERS: Record<string, StudyChapter[]> = {
  'gr4-cs':  GRADE4_CHAPTERS,
  'gr5-cs':  GRADE5_CHAPTERS,
  'gr6-cs':  GRADE6_CHAPTERS,
  'gr7-cs':  GRADE7_CHAPTERS,
  'gr8-cs':  GRADE8_CHAPTERS,
  'gr9-cs':  GRADE9CS_CHAPTERS,
  'gr9-dt':  GRADE9DT_CHAPTERS,
};

/* ── Practice tests per grade ── */
export const GRADE_PRACTICE_TESTS: Record<string, PracticeTest[]> = {
  'gr4-cs': [
    { id: 'gr4-pt1', title: 'Practice Test 1', description: 'Ch 1–5 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE4_CHAPTERS.slice(0,5).map(c=>c.key), maxQuestions: 20 },
    { id: 'gr4-pt2', title: 'Practice Test 2', description: 'Ch 6–9 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE4_CHAPTERS.slice(5).map(c=>c.key),   maxQuestions: 20 },
    { id: 'gr4-full', title: 'Full Mock Exam', description: 'All chapters · 35 questions · 50 min', timeLimitMinutes: 50, chapterKeys: GRADE4_CHAPTERS.map(c=>c.key), maxQuestions: 35 },
  ],
  'gr5-cs': [
    { id: 'gr5-pt1', title: 'Practice Test 1', description: 'Ch 1–5 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE5_CHAPTERS.slice(0,5).map(c=>c.key), maxQuestions: 20 },
    { id: 'gr5-pt2', title: 'Practice Test 2', description: 'Ch 6–9 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE5_CHAPTERS.slice(5).map(c=>c.key),   maxQuestions: 20 },
    { id: 'gr5-full', title: 'Full Mock Exam', description: 'All chapters · 35 questions · 50 min', timeLimitMinutes: 50, chapterKeys: GRADE5_CHAPTERS.map(c=>c.key), maxQuestions: 35 },
  ],
  'gr6-cs': [
    { id: 'gr6-pt1', title: 'Practice Test 1', description: 'Ch 1–5 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE6_CHAPTERS.slice(0,5).map(c=>c.key), maxQuestions: 20 },
    { id: 'gr6-pt2', title: 'Practice Test 2', description: 'Ch 6–9 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE6_CHAPTERS.slice(5).map(c=>c.key),   maxQuestions: 20 },
    { id: 'gr6-full', title: 'Full Mock Exam', description: 'All chapters · 35 questions · 50 min', timeLimitMinutes: 50, chapterKeys: GRADE6_CHAPTERS.map(c=>c.key), maxQuestions: 35 },
  ],
  'gr7-cs': [
    { id: 'gr7-pt1', title: 'Practice Test 1', description: 'Ch 1–5 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE7_CHAPTERS.slice(0,5).map(c=>c.key), maxQuestions: 20 },
    { id: 'gr7-pt2', title: 'Practice Test 2', description: 'Ch 6–10 · 20 questions · 30 min',timeLimitMinutes: 30, chapterKeys: GRADE7_CHAPTERS.slice(5).map(c=>c.key),   maxQuestions: 20 },
    { id: 'gr7-full', title: 'Full Mock Exam', description: 'All chapters · 40 questions · 60 min', timeLimitMinutes: 60, chapterKeys: GRADE7_CHAPTERS.map(c=>c.key), maxQuestions: 40 },
  ],
  'gr8-cs': [
    { id: 'gr8-pt1', title: 'Practice Test 1', description: 'Ch 1–6 · 25 questions · 35 min',  timeLimitMinutes: 35, chapterKeys: GRADE8_CHAPTERS.slice(0,6).map(c=>c.key), maxQuestions: 25 },
    { id: 'gr8-pt2', title: 'Practice Test 2', description: 'Ch 7–12 · 25 questions · 35 min', timeLimitMinutes: 35, chapterKeys: GRADE8_CHAPTERS.slice(6).map(c=>c.key),   maxQuestions: 25 },
    { id: 'gr8-full', title: 'Full Mock Exam', description: 'All chapters · 45 questions · 60 min', timeLimitMinutes: 60, chapterKeys: GRADE8_CHAPTERS.map(c=>c.key), maxQuestions: 45 },
  ],
  'gr9-cs': [
    { id: 'gr9cs-pt1', title: 'Practice Test 1', description: 'Ch 1–5 · 25 questions · 35 min',  timeLimitMinutes: 35, chapterKeys: GRADE9CS_CHAPTERS.slice(0,5).map(c=>c.key), maxQuestions: 25 },
    { id: 'gr9cs-pt2', title: 'Practice Test 2', description: 'Ch 6–10 · 25 questions · 35 min', timeLimitMinutes: 35, chapterKeys: GRADE9CS_CHAPTERS.slice(5,10).map(c=>c.key),maxQuestions: 25 },
    { id: 'gr9cs-pt3', title: 'Practice Test 3', description: 'Ch 11–15 · 25 questions · 35 min',timeLimitMinutes: 35, chapterKeys: GRADE9CS_CHAPTERS.slice(10).map(c=>c.key),  maxQuestions: 25 },
    { id: 'gr9cs-full', title: 'Full Mock Exam', description: 'All 15 chapters · 50 questions · 75 min', timeLimitMinutes: 75, chapterKeys: GRADE9CS_CHAPTERS.map(c=>c.key), maxQuestions: 50 },
  ],
  'gr9-dt': [
    { id: 'gr9dt-pt1', title: 'Practice Test 1', description: 'CC 1.1–1.4 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE9DT_CHAPTERS.slice(0,4).map(c=>c.key), maxQuestions: 20 },
    { id: 'gr9dt-pt2', title: 'Practice Test 2', description: 'CC 1.5–1.8 · 20 questions · 30 min', timeLimitMinutes: 30, chapterKeys: GRADE9DT_CHAPTERS.slice(4).map(c=>c.key),   maxQuestions: 20 },
    { id: 'gr9dt-full', title: 'Full Mock Exam', description: 'All CC topics · 40 questions · 55 min', timeLimitMinutes: 55, chapterKeys: GRADE9DT_CHAPTERS.map(c=>c.key), maxQuestions: 40 },
  ],
};

/* ── Legacy exports for /study/[classId]/[mode]/page.tsx ── */
export const PRACTICE_TESTS: PracticeTest[] = GRADE_PRACTICE_TESTS['gr7-cs'];

export function buildPracticeTest(testId: string, classId?: string): Question[] {
  const tests = classId ? (GRADE_PRACTICE_TESTS[classId] ?? PRACTICE_TESTS) : PRACTICE_TESTS;
  const test = tests.find(t => t.id === testId);
  if (!test) return [];
  const chapters = classId ? (GRADE_CHAPTERS[classId] ?? GRADE7_CHAPTERS) : GRADE7_CHAPTERS;
  return chapters
    .filter(ch => test.chapterKeys.includes(ch.key))
    .flatMap(ch => ch.questions)
    .slice(0, test.maxQuestions);
}

export function getChapterQuestions(chapterKey: string, classId?: string): Question[] {
  const chapters = classId ? (GRADE_CHAPTERS[classId] ?? GRADE7_CHAPTERS) : GRADE7_CHAPTERS;
  return chapters.find(c => c.key === chapterKey)?.questions ?? [];
}

export function getChapterFlashcards(chapterKey: string, classId?: string): Flashcard[] {
  const chapters = classId ? (GRADE_CHAPTERS[classId] ?? GRADE7_CHAPTERS) : GRADE7_CHAPTERS;
  return chapters.find(c => c.key === chapterKey)?.flashcards ?? [];
}
