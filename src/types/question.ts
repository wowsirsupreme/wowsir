export type QuestionType =
  | 'mcq'
  | 'truefalse'
  | 'shortanswer'
  | 'fillinblank'
  | 'matching'
  | 'ordering';

export interface Question {
  id: string;
  quizId: string | null;      // null = topic bank question
  topicKey: string;
  type: QuestionType;
  text: string;
  options: string[];
  answer: string;             // index (mcq), "true"/"false", text (short), etc.
  explanation?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  source?: 'builtin' | 'imported' | 'manual';
  points: number;
  createdAt?: number;

  // ── Extended metadata (all optional — existing questions unaffected) ──
  grade?: 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  subject?: string;             // e.g. 'Computing' | 'CS IGCSE 0478' | 'DT IGCSE 0445' | 'CS A-Level 9618'
  chapter?: number;
  chapterTitle?: string;
  term?: 1 | 2 | 3;
  week?: number;
  learningObjective?: string;
  cognitiveLevel?: 'recall' | 'understanding' | 'application' | 'analysis';
  sourceLesson?: string;        // topicKey of the source chapter, e.g. 'gr5-ch2-storage'
  sourceVersion?: string;       // e.g. '2026-27'
  teacherModified?: boolean;    // true = do NOT overwrite on re-seed
  updatedAt?: number;
}

export interface TopicBank {
  key: string;
  title: string;
  subject: string;
  questionCount: number;
}

export const TOPIC_LABELS: Record<string, { title: string; subject: string; emoji: string }> = {
  'scratch-basics':   { title: 'Scratch: Sprites & Backdrops', subject: 'Scratch',       emoji: '🐱' },
  'scratch-control':  { title: 'Scratch: Control & Logic',     subject: 'Scratch',       emoji: '🔄' },
  'word-layout':      { title: 'MS Word: Page Layout',          subject: 'Word',          emoji: '📄' },
  'word-tables':      { title: 'MS Word: Tables',               subject: 'Word',          emoji: '📊' },
  'html-basics':      { title: 'HTML Fundamentals',             subject: 'HTML',          emoji: '🌐' },
  'css-styling':      { title: 'CSS Styling',                   subject: 'CSS',           emoji: '🎨' },
  'small-basic':      { title: 'Small Basic Programming',       subject: 'Small Basic',   emoji: '💻' },
  'presentations':    { title: 'Smart Presentations',           subject: 'Presentations', emoji: '📽️' },
  'excel-basics':     { title: 'Excel 2016 Basics',             subject: 'Excel',         emoji: '📈' },

  /* ── Grade 7 legacy keys (kept for backwards compatibility) ── */
  'gr7-ch1-intro':    { title: 'Ch 1 – Introduction to Computing', subject: 'Grade 7 CS', emoji: '💡' },
  'gr7-ch2-ipo':      { title: 'Ch 2 – Input, Processing & Output', subject: 'Grade 7 CS', emoji: '⚙️' },
  'gr7-ch3-data':     { title: 'Ch 3 – Data & Information',         subject: 'Grade 7 CS', emoji: '📦' },
  'gr7-ch4-networks': { title: 'Ch 4 – Networks & the Internet',    subject: 'Grade 7 CS', emoji: '🌐' },
  'gr7-ch5-safety':   { title: 'Ch 5 – Digital Safety & Ethics',    subject: 'Grade 7 CS', emoji: '🛡️' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 4 — Computing
  // ════════════════════════════════════════════════════════════════
  'gr4-ch1-peripherals': { title: 'Ch 1 – Computer Peripherals',       subject: 'Grade 4 Computing', emoji: '🖨️' },
  'gr4-ch2-logo':        { title: 'Ch 2 – Circles & Polygons in Logo', subject: 'Grade 4 Computing', emoji: '🔷' },
  'gr4-ch3-files':       { title: 'Ch 3 – Managing Files & Folders',   subject: 'Grade 4 Computing', emoji: '📁' },
  'gr4-ch4-desktop':     { title: 'Ch 4 – Personalising Your Computer',subject: 'Grade 4 Computing', emoji: '🖥️' },
  'gr4-ch5-formatting':  { title: 'Ch 5 – Formatting Text',            subject: 'Grade 4 Computing', emoji: '🔤' },
  'gr4-ch6-word':        { title: 'Ch 6 – Styling a Word Document',    subject: 'Grade 4 Computing', emoji: '📄' },
  'gr4-ch7-internet':    { title: 'Ch 7 – The Net Connect',            subject: 'Grade 4 Computing', emoji: '🌍' },
  'gr4-ch8-ppt1':        { title: 'Ch 8 – Creating a Presentation',    subject: 'Grade 4 Computing', emoji: '📽️' },
  'gr4-ch9-ppt2':        { title: 'Ch 9 – Designing a Presentation',   subject: 'Grade 4 Computing', emoji: '🎨' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 5 — Computing
  // ════════════════════════════════════════════════════════════════
  'gr5-ch1-evolution': { title: 'Ch 1 – Computer Evolution',   subject: 'Grade 5 Computing', emoji: '🖥️' },
  'gr5-ch2-storage':   { title: 'Ch 2 – Data Storage Media',   subject: 'Grade 5 Computing', emoji: '💾' },
  'gr5-ch3-tables':    { title: 'Ch 3 – Organising in Word',         subject: 'Grade 5 Computing', emoji: '📊' },
  'gr5-ch4-pptanim':   { title: 'Ch 4 – Enliven a Presentation',     subject: 'Grade 5 Computing', emoji: '✨' },
  'gr5-ch5-slideshow': { title: 'Ch 5 – Slide Show Setup',           subject: 'Grade 5 Computing', emoji: '▶️' },
  'gr5-ch6-internet':  { title: 'Ch 6 – Dialog on the Internet',     subject: 'Grade 5 Computing', emoji: '🌐' },
  'gr5-ch7-multimedia':{ title: 'Ch 7 – Multimedia Around Us',       subject: 'Grade 5 Computing', emoji: '🎥' },
  'gr5-ch8-scratch1':  { title: 'Ch 8 – Scratch Basics',             subject: 'Grade 5 Computing', emoji: '🐱' },
  'gr5-ch9-scratch2':  { title: 'Ch 9 – Scratch Next Steps',         subject: 'Grade 5 Computing', emoji: '🔄' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 6 — Computing
  // ════════════════════════════════════════════════════════════════
  'gr6-ch1-robotics':   { title: 'Ch 1 – Robotics',                    subject: 'Grade 6 Computing', emoji: '🤖' },
  'gr6-ch2-mailmerge':  { title: 'Ch 2 – Create & Send Invitations',   subject: 'Grade 6 Computing', emoji: '✉️' },
  'gr6-ch3-email':      { title: 'Ch 3 – Communication Using Emails',  subject: 'Grade 6 Computing', emoji: '📧' },
  'gr6-ch4-excel1':     { title: 'Ch 4 – Create a Spreadsheet',        subject: 'Grade 6 Computing', emoji: '📈' },
  'gr6-ch5-excel2':     { title: 'Ch 5 – Edit Cell Contents',          subject: 'Grade 6 Computing', emoji: '✏️' },
  'gr6-ch6-excel3':     { title: 'Ch 6 – Format Cell Contents',        subject: 'Grade 6 Computing', emoji: '🎨' },
  'gr6-ch7-algorithms': { title: 'Ch 7 – Algorithms & Flowcharts',     subject: 'Grade 6 Computing', emoji: '🔀' },
  'gr6-ch8-scratch3':   { title: 'Ch 8 – Scratch: More Blocks & Games',subject: 'Grade 6 Computing', emoji: '🎮' },
  'gr6-ch9-qb64':       { title: 'Ch 9 – QB64 Basics',                 subject: 'Grade 6 Computing', emoji: '💻' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 7 — Computing (new canonical keys)
  // ════════════════════════════════════════════════════════════════
  'gr7-ch1-numbers':      { title: 'Ch 1 – Number Systems',              subject: 'Grade 7 Computing', emoji: '🔢' },
  'gr7-ch2-excel-calc':   { title: 'Ch 2 – Calculations in Excel',       subject: 'Grade 7 Computing', emoji: '📊' },
  'gr7-ch3-excel-data':   { title: 'Ch 3 – Analyse Data in Excel',       subject: 'Grade 7 Computing', emoji: '📉' },
  'gr7-ch4-excel-charts': { title: 'Ch 4 – Data Representation (Charts)',subject: 'Grade 7 Computing', emoji: '📈' },
  'gr7-ch5-internet':     { title: 'Ch 5 – Go Online',                   subject: 'Grade 7 Computing', emoji: '🌐' },
  'gr7-ch6-html1':        { title: 'Ch 6 – HTML Basics',                 subject: 'Grade 7 Computing', emoji: '🌐' },
  'gr7-ch7-html2':        { title: 'Ch 7 – HTML Next Steps',             subject: 'Grade 7 Computing', emoji: '🔗' },
  'gr7-ch8-ai':           { title: 'Ch 8 – Artificial Intelligence',     subject: 'Grade 7 Computing', emoji: '🤖' },
  'gr7-ch9-qb64':         { title: 'Ch 9 – QB64 Next Steps',             subject: 'Grade 7 Computing', emoji: '💻' },
  'gr7-ch10-python':      { title: 'Ch 10 – Python Basics',              subject: 'Grade 7 Computing', emoji: '🐍' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 8 — Computing
  // ════════════════════════════════════════════════════════════════
  'gr8-ch1-ai':           { title: 'Ch 1 – Artificial Intelligence',           subject: 'Grade 8 Computing', emoji: '🤖' },
  'gr8-ch2-tech':         { title: 'Ch 2 – Latest Technologies & Trends',     subject: 'Grade 8 Computing', emoji: '🚀' },
  'gr8-ch3-access1':      { title: 'Ch 3 – Database Management (Access)',      subject: 'Grade 8 Computing', emoji: '🗄️' },
  'gr8-ch4-access2':      { title: 'Ch 4 – Table Relationships & Queries',     subject: 'Grade 8 Computing', emoji: '🔗' },
  'gr8-ch5-access3':      { title: 'Ch 5 – Forms & Reports',                   subject: 'Grade 8 Computing', emoji: '📋' },
  'gr8-ch6-networks':     { title: 'Ch 6 – Communication Technology',          subject: 'Grade 8 Computing', emoji: '📡' },
  'gr8-ch7-google':       { title: 'Ch 7 – Play with Google Apps',             subject: 'Grade 8 Computing', emoji: '🔍' },
  'gr8-ch8-malware':      { title: 'Ch 8 – Computer Malware',                  subject: 'Grade 8 Computing', emoji: '🦠' },
  'gr8-ch9-html-tables':  { title: 'Ch 9 – Website Designing: Tables',         subject: 'Grade 8 Computing', emoji: '📄' },
  'gr8-ch10-social':      { title: 'Ch 10 – Social Networking & Cyber Safety', subject: 'Grade 8 Computing', emoji: '🛡️' },
  'gr8-ch11-troubleshoot':{ title: 'Ch 11 – Troubleshooting',                  subject: 'Grade 8 Computing', emoji: '🔧' },
  'gr8-ch12-python':      { title: 'Ch 12 – Python Next Steps',                subject: 'Grade 8 Computing', emoji: '🐍' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 9 — CS IGCSE 0478 (Year 1, 2026–27)
  // ════════════════════════════════════════════════════════════════
  'gr9-cpu':              { title: 'Ch 2.2/2.3 – Hardware & CPU',                    subject: 'Grade 9 CS (IGCSE)', emoji: '⚡' },
  'gr9-memory':           { title: 'Ch 2.3 – Memory (RAM, ROM, Cache)',              subject: 'Grade 9 CS (IGCSE)', emoji: '💾' },
  'gr9-io-devices':       { title: 'Ch 2.2 – Input & Output Devices',                subject: 'Grade 9 CS (IGCSE)', emoji: '🖨️' },
  'gr9-fde':              { title: 'Ch 2.2 – Fetch-Decode-Execute Cycle',            subject: 'Grade 9 CS (IGCSE)', emoji: '🔁' },
  'gr9-embedded':         { title: 'Ch 6.1 – Embedded Systems & Sensors',            subject: 'Grade 9 CS (IGCSE)', emoji: '🔌' },
  'gr9-storage':          { title: 'Ch 2.3 – Data Storage',                          subject: 'Grade 9 CS (IGCSE)', emoji: '💿' },
  'gr9-os':               { title: 'Ch 5.1 – Types of Software & Interrupts',        subject: 'Grade 9 CS (IGCSE)', emoji: '🖥️' },
  'gr9-languages':        { title: 'Ch 5.2 – Programming Languages, Translators & IDEs', subject: 'Grade 9 CS (IGCSE)', emoji: '🔤' },
  'gr9-packet-switching': { title: 'Ch 3.1 – Packet Switching',                      subject: 'Grade 9 CS (IGCSE)', emoji: '📦' },
  'gr9-data-transmission':{ title: 'Ch 3.2 – Data Transmission',                     subject: 'Grade 9 CS (IGCSE)', emoji: '📶' },
  'gr9-ip-addresses':     { title: 'Ch 3.3 – Internet Protocol Addresses',           subject: 'Grade 9 CS (IGCSE)', emoji: '🔢' },
  'gr9-internet':         { title: 'Ch 3.4 – The Internet & the World Wide Web',     subject: 'Grade 9 CS (IGCSE)', emoji: '🌍' },
  'gr9-logic':            { title: 'Ch 1.1.3/2.1 – Logic Gates & Circuits',          subject: 'Grade 9 CS (IGCSE)', emoji: '⚙️' },
  'gr9-data-rep':         { title: 'Ch 1.1–1.3 – Data Representation',               subject: 'Grade 9 CS (IGCSE)', emoji: '🔢' },
  'gr9-data-binary':      { title: 'Ch 1.1 – Binary & Hexadecimal',                  subject: 'Grade 9 CS (IGCSE)', emoji: '🔢' },
  'gr9-data-twos':        { title: "Ch 1.1 – Two's Complement",                      subject: 'Grade 9 CS (IGCSE)', emoji: '±' },
  'gr9-data-text':        { title: 'Ch 1.2 – ASCII & Unicode',                       subject: 'Grade 9 CS (IGCSE)', emoji: '🔤' },
  'gr9-data-sound':       { title: 'Ch 1.2 – Sound Representation',                  subject: 'Grade 9 CS (IGCSE)', emoji: '🎵' },
  'gr9-data-images':      { title: 'Ch 1.2 – Image Representation',                  subject: 'Grade 9 CS (IGCSE)', emoji: '🖼️' },
  'gr9-data-compression': { title: 'Ch 1.3 – Compression',                           subject: 'Grade 9 CS (IGCSE)', emoji: '📦' },
  // Imported/alias topic keys — kept for Firestore backwards-compat, hidden from picker (see LEGACY_TOPIC_KEYS)
  'gr9-number-systems':   { title: 'Ch 1.1 – Number Systems',                        subject: 'Grade 9 CS (IGCSE)', emoji: '🔢' },
  'gr9-text-sound-images':{ title: 'Ch 1.2/1.3 – Text, Sound & Images',              subject: 'Grade 9 CS (IGCSE)', emoji: '🖼️' },
  'gr9-compression':      { title: 'Ch 1.3 – Compression',                           subject: 'Grade 9 CS (IGCSE)', emoji: '📦' },
  'gr9-networking':       { title: 'Ch 3.1–3.3 – Networking & Protocols',            subject: 'Grade 9 CS (IGCSE)', emoji: '📡' },
  'gr9-networks':         { title: 'Ch 3.1–3.3 – Data Transmission & Networking',    subject: 'Grade 9 CS (IGCSE)', emoji: '📡' },
  'gr9-programming':      { title: 'Ch 8.1/8.2 – Programming Fundamentals',          subject: 'Grade 9 CS (IGCSE)', emoji: '💻' },
  'gr9-algorithms':       { title: 'Ch 9.1–9.3 – Algorithm Design',                  subject: 'Grade 9 CS (IGCSE)', emoji: '🔀' },
  'gr9-cybersec':         { title: 'Ch 4.2 – Cybersecurity',                         subject: 'Grade 9 CS (IGCSE)', emoji: '🔒' },
  'gr9-prog-concepts':    { title: 'Ch 8.1 – Programming Concepts',                 subject: 'Grade 9 CS (IGCSE)', emoji: '💻' },
  'gr9-prog-operators':   { title: 'Ch 8.2 – Programming Operators',                subject: 'Grade 9 CS (IGCSE)', emoji: '➕' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 9 — DT IGCSE 0445 (Graphic Products)
  // ════════════════════════════════════════════════════════════════
  // ── Common content (Section 1) ──
  'gr9dt-influences':    { title: '1.1 – Influences on Designing',              subject: 'Grade 9 DT (IGCSE)', emoji: '🎭' },
  'gr9dt-design-brief':  { title: '1.2.1/1.2.2 – Identifying & Defining',      subject: 'Grade 9 DT (IGCSE)', emoji: '🔍' },
  'gr9dt-developing':    { title: '1.2.3/1.2.4 – Proposing & Developing',      subject: 'Grade 9 DT (IGCSE)', emoji: '✏️' },
  'gr9dt-plan':          { title: '1.2.5 – Planning',                           subject: 'Grade 9 DT (IGCSE)', emoji: '📋' },
  'gr9dt-evaluation':    { title: '1.2.6 – Testing & Evaluating',               subject: 'Grade 9 DT (IGCSE)', emoji: '✅' },
  'gr9dt-communication': { title: '1.3 – Communicating Designs',                subject: 'Grade 9 DT (IGCSE)', emoji: '📐' },
  'gr9dt-making':        { title: '1.4 – Making Principles',                    subject: 'Grade 9 DT (IGCSE)', emoji: '🔨' },
  'gr9dt-materials':     { title: '1.5 – Material Classification',              subject: 'Grade 9 DT (IGCSE)', emoji: '🧱' },
  'gr9dt-structures':    { title: '1.6 – Structures',                           subject: 'Grade 9 DT (IGCSE)', emoji: '🏗️' },
  'gr9dt-mechanisms':    { title: '1.7 – Mechanisms',                           subject: 'Grade 9 DT (IGCSE)', emoji: '⚙️' },
  'gr9dt-electronics':   { title: '1.8 – Electronics',                          subject: 'Grade 9 DT (IGCSE)', emoji: '⚡' },
  // ── Materials option (Section 2) ──
  'gr9dt-manufacturing': { title: '2.3 – Commercial Manufacturing Methods',     subject: 'Grade 9 DT (IGCSE)', emoji: '🏭' },
  'gr9dt-health-safety': { title: '2.2.5 – Safe Working Practices',             subject: 'Grade 9 DT (IGCSE)', emoji: '🦺' },
  // ── Legacy alias keys — kept for Firestore backwards-compat, hidden from picker ──
  'gr9dt-design1':       { title: '1.2.1/1.2.2 – Identifying & Defining',      subject: 'Grade 9 DT (IGCSE)', emoji: '🔍' },
  'gr9dt-design2':       { title: '1.2.3/1.2.4 – Proposing & Developing',      subject: 'Grade 9 DT (IGCSE)', emoji: '✏️' },
  'gr9dt-design3':       { title: '1.2.5/1.2.6 – Planning & Testing',          subject: 'Grade 9 DT (IGCSE)', emoji: '📋' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 10 — CS IGCSE 0478 (Year 2, 2027–28)
  // ════════════════════════════════════════════════════════════════
  'gr10-data-integrity':  { title: 'Ch 4.1 – Data Integrity',                        subject: 'Grade 10 CS (IGCSE)', emoji: '✅' },
  'gr10-cybersecurity':   { title: 'Ch 4.2 – Cybersecurity',                         subject: 'Grade 10 CS (IGCSE)', emoji: '🔒' },
  'gr10-encryption':      { title: 'Ch 4.2 – Encryption & Security',                 subject: 'Grade 10 CS (IGCSE)', emoji: '🔐' },
  'gr10-sensors':         { title: 'Ch 6.1.1–6.1.6 – Sensors & Microcontrollers',   subject: 'Grade 10 CS (IGCSE)', emoji: '📡' },
  'gr10-robotics':        { title: 'Ch 6.1.7–6.2 – Automated Systems & Robotics',   subject: 'Grade 10 CS (IGCSE)', emoji: '🤖' },
  'gr10-ai':              { title: 'Ch 7.1 – Artificial Intelligence',               subject: 'Grade 10 CS (IGCSE)', emoji: '🧠' },
  'gr10-quantum':         { title: 'Ch 7.2 – Quantum Computing',                     subject: 'Grade 10 CS (IGCSE)', emoji: '⚛️' },
  'gr10-abstraction':     { title: 'Ch 9.1 – Abstraction & Decomposition',           subject: 'Grade 10 CS (IGCSE)', emoji: '🧩' },
  'gr10-algorithms':      { title: 'Ch 9.1–9.3 – Algorithm Design & Analysis',      subject: 'Grade 10 CS (IGCSE)', emoji: '🔀' },
  'gr10-boolean':         { title: 'Ch 2.1 – Boolean Logic & Circuits',              subject: 'Grade 10 CS (IGCSE)', emoji: '⚙️' },
  'gr10-programming':     { title: 'Ch 10.1–10.3 – Further Programming & Testing',  subject: 'Grade 10 CS (IGCSE)', emoji: '💻' },
  'gr10-system-analysis': { title: 'Ch 9.1 – System Analysis & Design',             subject: 'Grade 10 CS (IGCSE)', emoji: '📊' },
  'gr10-sql':             { title: 'Ch 11 – Databases & SQL',                        subject: 'Grade 10 CS (IGCSE)', emoji: '🗄️' },
  // Alias keys — kept for Firestore backwards-compat, hidden from picker (see LEGACY_TOPIC_KEYS)
  'gr10-algorithms-adv':  { title: 'Ch 9.1–9.3 – Algorithm Design',                 subject: 'Grade 10 CS (IGCSE)', emoji: '🔀' },
  'gr10-python-adv':      { title: 'Ch 10.1–10.3 – Further Programming',            subject: 'Grade 10 CS (IGCSE)', emoji: '🐍' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 11 — CS IGCSE 0478 (Year 3, 2028–29 — revision & exam prep)
  // ════════════════════════════════════════════════════════════════
  'gr11-information':     { title: 'Ch 1.1–1.3 – Information Representation',       subject: 'Grade 11 CS (IGCSE)', emoji: '🔢' },
  'gr11-communication':   { title: 'Ch 3.1–3.4 – Communication & Networking',       subject: 'Grade 11 CS (IGCSE)', emoji: '📡' },
  'gr11-hardware':        { title: 'Ch 2.1 – Logic Circuits & Boolean Algebra',     subject: 'Grade 11 CS (IGCSE)', emoji: '⚙️' },
  'gr11-logic':           { title: 'Ch 2.1 – Logic Gates & Simplification',         subject: 'Grade 11 CS (IGCSE)', emoji: '⚙️' },
  'gr11-processor':       { title: 'Ch 2.2/2.3 – Processor & Memory',               subject: 'Grade 11 CS (IGCSE)', emoji: '⚡' },
  'gr11-os':              { title: 'Ch 5.1/5.2 – OS & System Software',             subject: 'Grade 11 CS (IGCSE)', emoji: '🖥️' },
  'gr11-system-software': { title: 'Ch 5.1/5.2 – System Software',                  subject: 'Grade 11 CS (IGCSE)', emoji: '🖥️' },
  'gr11-security':        { title: 'Ch 4.1/4.2 – Security & Ethics',                subject: 'Grade 11 CS (IGCSE)', emoji: '🔒' },
  'gr11-ai-advanced':     { title: 'Ch 7.1/7.2 – AI & Quantum (Revision)',          subject: 'Grade 11 CS (IGCSE)', emoji: '🧠' },
  'gr11-programming':     { title: 'Ch 10.4/10.5 – File Handling & Testing',        subject: 'Grade 11 CS (IGCSE)', emoji: '📚' },
  'gr11-oop':             { title: 'Ch 10.1–10.3 – Object-Oriented Programming',   subject: 'Grade 11 CS (IGCSE)', emoji: '🏗️' },
  'gr11-data-structures': { title: 'Ch 11 – Databases & SQL',                        subject: 'Grade 11 CS (IGCSE)', emoji: '📦' },
  'gr11-algorithms':      { title: 'Ch 9.1–9.3 – Algorithms (Revision)',            subject: 'Grade 11 CS (IGCSE)', emoji: '🔀' },
  'gr11-databases':       { title: 'Ch 11 – Databases & SQL',                        subject: 'Grade 11 CS (IGCSE)', emoji: '🗄️' },

  // ════════════════════════════════════════════════════════════════
  // CS (A Level 9618) — Cambridge International AS & A Level
  // AS Level — Papers 1 & 2 (Chapters 1–12)
  // ════════════════════════════════════════════════════════════════
  'alcs-data-rep':        { title: 'Ch 1 – Data Representation',                    subject: 'CS (A Level 9618)', emoji: '🔢' },
  'alcs-communication':   { title: 'Ch 2 – Communication & Internet Technologies',  subject: 'CS (A Level 9618)', emoji: '📡' },
  'alcs-hardware':        { title: 'Ch 3 – Hardware',                               subject: 'CS (A Level 9618)', emoji: '🖥️' },
  'alcs-processor':       { title: 'Ch 4 – Processor Fundamentals',                 subject: 'CS (A Level 9618)', emoji: '⚡' },
  'alcs-system-software': { title: 'Ch 5 – System Software',                        subject: 'CS (A Level 9618)', emoji: '🔧' },
  'alcs-security':        { title: 'Ch 6 – Security, Privacy & Data Integrity',     subject: 'CS (A Level 9618)', emoji: '🔒' },
  'alcs-ethics':          { title: 'Ch 7 – Ethics & Ownership',                     subject: 'CS (A Level 9618)', emoji: '⚖️' },
  'alcs-databases':       { title: 'Ch 8 – Databases & Data Modelling',             subject: 'CS (A Level 9618)', emoji: '🗄️' },
  'alcs-algorithms':      { title: 'Ch 9 – Algorithm Design & Problem Solving',     subject: 'CS (A Level 9618)', emoji: '🔀' },
  'alcs-data-structures': { title: 'Ch 10 – Data Types, Structures & Algorithms',   subject: 'CS (A Level 9618)', emoji: '📦' },
  'alcs-programming':     { title: 'Ch 11 – Programming',                           subject: 'CS (A Level 9618)', emoji: '💻' },
  'alcs-software-dev':    { title: 'Ch 12 – Software Development',                  subject: 'CS (A Level 9618)', emoji: '🛠️' },
  // A Level only — Papers 3 & 4 (Chapters 13–20)
  'alcs-adv-data-rep':    { title: 'Ch 13 – Further Data Representation',           subject: 'CS (A Level 9618)', emoji: '🧮' },
  'alcs-adv-internet':    { title: 'Ch 14 – Further Communication & Internet',      subject: 'CS (A Level 9618)', emoji: '🌐' },
  'alcs-adv-hardware':    { title: 'Ch 15 – Further Hardware',                      subject: 'CS (A Level 9618)', emoji: '🔩' },
  'alcs-adv-system':      { title: 'Ch 16 – System Software & Virtual Machines',   subject: 'CS (A Level 9618)', emoji: '🖧' },
  'alcs-adv-security':    { title: 'Ch 17 – Cryptography & Network Security',       subject: 'CS (A Level 9618)', emoji: '🔐' },
  'alcs-ai':              { title: 'Ch 18 – Artificial Intelligence',               subject: 'CS (A Level 9618)', emoji: '🧠' },
  'alcs-adv-algorithms':  { title: 'Ch 19 – Further Algorithm Design & Complexity', subject: 'CS (A Level 9618)', emoji: '🔬' },
  'alcs-adv-programming': { title: 'Ch 20 – Computational Intelligence & Paradigms',subject: 'CS (A Level 9618)', emoji: '🎯' },
};

const LEGACY_SUBJECTS = new Set([
  'Scratch', 'Word', 'HTML', 'CSS', 'Small Basic', 'Presentations', 'Excel',
  'Grade 7 CS',   // old duplicate legacy keys (gr7-ch1-intro etc.) superseded by Grade 7 Computing
]);

/** Individual topic keys hidden from the picker but kept in TOPIC_LABELS for
 *  Firestore backwards-compatibility (old quiz docs may reference these keys). */
const LEGACY_TOPIC_KEYS = new Set([
  // Grade 5 — old/granular keys superseded by chapter-level keys
  'gr5-ch1-history',           // old chapter-level key
  'gr5-ch1-early-counting', 'gr5-ch1-abacus', 'gr5-ch1-napier', 'gr5-ch1-pascaline',
  'gr5-ch1-leibniz', 'gr5-ch1-jacquard', 'gr5-ch1-babbage-lovelace', 'gr5-ch1-hollerith',
  'gr5-ch1-mark1', 'gr5-ch1-gen1', 'gr5-ch1-gen2', 'gr5-ch1-gen3', 'gr5-ch1-gen4',
  'gr5-ch1-gen5', 'gr5-ch1-mainframe-super', 'gr5-ch1-smartphone', 'gr5-ch1-ai-nlp-ar-vr',
  'gr5-ch2-binary', 'gr5-ch2-units', 'gr5-ch2-ram-rom', 'gr5-ch2-secondary-overview',
  'gr5-ch2-harddisk', 'gr5-ch2-cd', 'gr5-ch2-dvd', 'gr5-ch2-bluray', 'gr5-ch2-rw-vs-r',
  'gr5-ch2-pendrive-memorycard', 'gr5-ch2-cloud', 'gr5-ch2-magnetictape', 'gr5-ch2-review',
  // Grade 9 — old CSV-import aliases superseded by granular gr9-data-* / gr9-os etc.
  'gr9-number-systems',
  'gr9-text-sound-images',
  'gr9-compression',
  'gr9-networking',
  'gr9-networks',
  'gr9-programming',
  'gr9-algorithms',
  'gr9-cybersec',
  // Grade 10 — duplicate/alias keys
  'gr10-algorithms-adv',   // duplicate of gr10-algorithms
  'gr10-python-adv',       // duplicate of gr10-programming
  'gr10-encryption',       // duplicate of gr10-cybersecurity (both Ch 4.2)
  // Grade 11 — duplicate keys
  'gr11-system-software',  // duplicate of gr11-os
  'gr11-logic',            // duplicate of gr11-hardware (both Ch 2.1)
  // Grade 9 DT — duplicate/alias keys superseded by granular design-process keys
  'gr9dt-design1',         // duplicate of gr9dt-design-brief (1.2.1/1.2.2)
  'gr9dt-design2',         // duplicate of gr9dt-developing (1.2.3/1.2.4)
  'gr9dt-design3',         // superseded by gr9dt-plan + gr9dt-evaluation (1.2.5/1.2.6)
]);

/** Returns topics grouped by their subject, preserving insertion order.
 *  Excludes old standalone/legacy subjects (Scratch, Word, HTML, etc.) and
 *  individual alias/duplicate keys listed in LEGACY_TOPIC_KEYS. */
export function getGroupedTopics(): Array<{ subject: string; topics: Array<{ key: string; title: string; emoji: string }> }> {
  const map = new Map<string, Array<{ key: string; title: string; emoji: string }>>();
  for (const [key, t] of Object.entries(TOPIC_LABELS)) {
    if (LEGACY_SUBJECTS.has(t.subject)) continue;   // skip old standalone legacy topics
    if (LEGACY_TOPIC_KEYS.has(key)) continue;       // skip individual alias/duplicate keys
    const group = map.get(t.subject) ?? [];
    group.push({ key, title: t.title, emoji: t.emoji });
    map.set(t.subject, group);
  }
  return Array.from(map.entries()).map(([subject, topics]) => ({ subject, topics }));
}
