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
  'gr5-ch1-history':   { title: 'Ch 1 – Computer Evolution',         subject: 'Grade 5 Computing', emoji: '🏛️' },
  'gr5-ch2-storage':   { title: 'Ch 2 – Data Storage Media',         subject: 'Grade 5 Computing', emoji: '💾' },
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
  'gr8-ch1-ai':          { title: 'Ch 1 – Artificial Intelligence',       subject: 'Grade 8 Computing', emoji: '🤖' },
  'gr8-ch2-tech':        { title: 'Ch 2 – Latest Technologies & Trends',  subject: 'Grade 8 Computing', emoji: '🚀' },
  'gr8-ch3-access1':     { title: 'Ch 3 – Database Management (Access)',  subject: 'Grade 8 Computing', emoji: '🗄️' },
  'gr8-ch4-access2':     { title: 'Ch 4 – Table Relationships',           subject: 'Grade 8 Computing', emoji: '🔗' },
  'gr8-ch5-access3':     { title: 'Ch 5 – Forms & Reports',               subject: 'Grade 8 Computing', emoji: '📋' },
  'gr8-ch6-networks':    { title: 'Ch 6 – Communication Technology',      subject: 'Grade 8 Computing', emoji: '📡' },
  'gr8-ch7-google':      { title: 'Ch 7 – Google Apps',                   subject: 'Grade 8 Computing', emoji: '🔍' },
  'gr8-ch8-malware':     { title: 'Ch 8 – Computer Malware',              subject: 'Grade 8 Computing', emoji: '🦠' },
  'gr8-ch9-html-tables': { title: 'Ch 9 – HTML Tables',                   subject: 'Grade 8 Computing', emoji: '📄' },
  'gr8-ch10-social':     { title: 'Ch 10 – Social Networking & Cyber Safety', subject: 'Grade 8 Computing', emoji: '🛡️' },
  'gr8-ch11-troubleshoot':{ title: 'Ch 11 – Troubleshooting',             subject: 'Grade 8 Computing', emoji: '🔧' },
  'gr8-ch12-python':     { title: 'Ch 12 – Python Next Steps',            subject: 'Grade 8 Computing', emoji: '🐍' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 9 — CS IGCSE 0478 (Year 1)
  // ════════════════════════════════════════════════════════════════
  'gr9-cpu':              { title: 'CPU Architecture',               subject: 'CS IGCSE 0478', emoji: '⚡' },
  'gr9-fde':              { title: 'Fetch-Decode-Execute Cycle',     subject: 'CS IGCSE 0478', emoji: '🔁' },
  'gr9-embedded':         { title: 'Embedded Systems',               subject: 'CS IGCSE 0478', emoji: '🔌' },
  'gr9-storage':          { title: 'Storage',                        subject: 'CS IGCSE 0478', emoji: '💾' },
  'gr9-os':               { title: 'Operating Systems',              subject: 'CS IGCSE 0478', emoji: '🖥️' },
  'gr9-languages':        { title: 'Programming Languages & Translators', subject: 'CS IGCSE 0478', emoji: '🔤' },
  'gr9-internet':         { title: 'Internet & the Web',             subject: 'CS IGCSE 0478', emoji: '🌍' },
  'gr9-logic':            { title: 'Logic Gates & Circuits',         subject: 'CS IGCSE 0478', emoji: '⚙️' },
  'gr9-data-binary':      { title: 'Binary & Hexadecimal',           subject: 'CS IGCSE 0478', emoji: '🔢' },
  'gr9-data-twos':        { title: "Two's Complement",               subject: 'CS IGCSE 0478', emoji: '±' },
  'gr9-data-text':        { title: 'ASCII & Unicode',                subject: 'CS IGCSE 0478', emoji: '🔤' },
  'gr9-data-sound':       { title: 'Sound Representation',           subject: 'CS IGCSE 0478', emoji: '🎵' },
  'gr9-data-images':      { title: 'Image Representation',           subject: 'CS IGCSE 0478', emoji: '🖼️' },
  'gr9-data-compression': { title: 'Compression',                   subject: 'CS IGCSE 0478', emoji: '📦' },
  // Imported topic keys (CSV imports use these aliases)
  'gr9-number-systems':   { title: 'Number Systems & Data',          subject: 'CS IGCSE 0478', emoji: '🔢' },
  'gr9-text-sound-images':{ title: 'Text, Sound & Images',           subject: 'CS IGCSE 0478', emoji: '🖼️' },
  'gr9-compression':      { title: 'Compression',                    subject: 'CS IGCSE 0478', emoji: '📦' },
  'gr9-networking':       { title: 'Networking & Protocols',         subject: 'CS IGCSE 0478', emoji: '📡' },
  'gr9-programming':      { title: 'Programming Fundamentals',       subject: 'CS IGCSE 0478', emoji: '💻' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 9 — DT IGCSE 0445
  // ════════════════════════════════════════════════════════════════
  'gr9dt-influences':    { title: 'CC 1.1 – Influences on Designing',    subject: 'DT IGCSE 0445', emoji: '🎭' },
  'gr9dt-design-brief':  { title: 'CC 1.2a – Design Brief',              subject: 'DT IGCSE 0445', emoji: '🔍' },
  'gr9dt-developing':    { title: 'CC 1.2b – Developing Designs',        subject: 'DT IGCSE 0445', emoji: '✏️' },
  'gr9dt-plan':          { title: 'CC 1.2c – Planning',                  subject: 'DT IGCSE 0445', emoji: '📋' },
  'gr9dt-evaluation':    { title: 'CC 1.2d – Evaluation & Testing',      subject: 'DT IGCSE 0445', emoji: '✅' },
  'gr9dt-design1':       { title: 'CC 1.2a – Identifying & Defining',    subject: 'DT IGCSE 0445', emoji: '🔍' },
  'gr9dt-design2':       { title: 'CC 1.2b – Proposing & Developing',    subject: 'DT IGCSE 0445', emoji: '✏️' },
  'gr9dt-design3':       { title: 'CC 1.2c – Planning & Testing',        subject: 'DT IGCSE 0445', emoji: '📋' },
  'gr9dt-communication': { title: 'CC 1.3 – Communicating Designs',      subject: 'DT IGCSE 0445', emoji: '📐' },
  'gr9dt-making':        { title: 'CC 1.4 – Making Principles',          subject: 'DT IGCSE 0445', emoji: '🔨' },
  'gr9dt-materials':     { title: 'CC 1.5 – Material Classification',    subject: 'DT IGCSE 0445', emoji: '🧱' },
  'gr9dt-manufacturing': { title: 'CC 1.5b – Manufacturing Processes',   subject: 'DT IGCSE 0445', emoji: '🏭' },
  'gr9dt-health-safety': { title: 'CC 1.5c – Health & Safety',           subject: 'DT IGCSE 0445', emoji: '🦺' },
  'gr9dt-structures':    { title: 'CC 1.6 – Structures',                 subject: 'DT IGCSE 0445', emoji: '🏗️' },
  'gr9dt-mechanisms':    { title: 'CC 1.7 – Mechanisms',                 subject: 'DT IGCSE 0445', emoji: '⚙️' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 10 — CS IGCSE 0478 (Year 2 — remaining topics)
  // ════════════════════════════════════════════════════════════════
  'gr10-data-integrity': { title: 'Data Integrity',                  subject: 'CS IGCSE 0478', emoji: '✅' },
  'gr10-cybersecurity':  { title: 'Cybersecurity',                   subject: 'CS IGCSE 0478', emoji: '🔒' },
  'gr10-encryption':     { title: 'Encryption',                      subject: 'CS IGCSE 0478', emoji: '🔐' },
  'gr10-sensors':        { title: 'Sensors, Microcontrollers & Actuators', subject: 'CS IGCSE 0478', emoji: '📡' },
  'gr10-robotics':       { title: 'Robotics',                        subject: 'CS IGCSE 0478', emoji: '🤖' },
  'gr10-ai':             { title: 'Artificial Intelligence',         subject: 'CS IGCSE 0478', emoji: '🧠' },
  'gr10-quantum':        { title: 'Quantum Computing',               subject: 'CS IGCSE 0478', emoji: '⚛️' },
  'gr10-abstraction':    { title: 'Abstraction & Decomposition',     subject: 'CS IGCSE 0478', emoji: '🧩' },
  'gr10-algorithms':     { title: 'Algorithm Design & Analysis',     subject: 'CS IGCSE 0478', emoji: '🔀' },
  'gr10-programming':    { title: 'Further Programming & Testing',   subject: 'CS IGCSE 0478', emoji: '💻' },
  'gr10-sql':            { title: 'Databases & SQL',                 subject: 'CS IGCSE 0478', emoji: '🗄️' },

  // ════════════════════════════════════════════════════════════════
  // GRADE 11 — CS A-Level 9618
  // ════════════════════════════════════════════════════════════════
  'gr11-information':     { title: 'Information Representation',      subject: 'CS A-Level 9618', emoji: '🔢' },
  'gr11-communication':   { title: 'Communication & Internet Tech',   subject: 'CS A-Level 9618', emoji: '📡' },
  'gr11-hardware':        { title: 'Logic Circuits & Boolean Algebra',subject: 'CS A-Level 9618', emoji: '⚙️' },
  'gr11-processor':       { title: 'Processor Fundamentals',          subject: 'CS A-Level 9618', emoji: '⚡' },
  'gr11-system-software': { title: 'System Software',                 subject: 'CS A-Level 9618', emoji: '🖥️' },
  'gr11-security':        { title: 'Security, Privacy & Ethics',      subject: 'CS A-Level 9618', emoji: '🔒' },
  'gr11-ai-advanced':     { title: 'Artificial Intelligence (AS)',     subject: 'CS A-Level 9618', emoji: '🧠' },
  'gr11-programming':     { title: 'Abstract Data Types & Recursion', subject: 'CS A-Level 9618', emoji: '📚' },
  'gr11-oop':             { title: 'Object-Oriented Programming',     subject: 'CS A-Level 9618', emoji: '🏗️' },
  'gr11-algorithms':      { title: 'Further Algorithms & Big-O',      subject: 'CS A-Level 9618', emoji: '🔀' },
  'gr11-databases':       { title: 'Databases & Normalisation',       subject: 'CS A-Level 9618', emoji: '🗄️' },
};

/** Returns topics grouped by their subject, preserving insertion order.
 *  Only includes topics whose title starts with "Ch" (chapter topics),
 *  hiding old standalone/legacy entries like "Smart Presentations". */
export function getGroupedTopics(): Array<{ subject: string; topics: Array<{ key: string; title: string; emoji: string }> }> {
  const map = new Map<string, Array<{ key: string; title: string; emoji: string }>>();
  for (const [key, t] of Object.entries(TOPIC_LABELS)) {
    if (!t.title.startsWith('Ch')) continue;   // skip non-chapter legacy topics
    const group = map.get(t.subject) ?? [];
    group.push({ key, title: t.title, emoji: t.emoji });
    map.set(t.subject, group);
  }
  return Array.from(map.entries()).map(([subject, topics]) => ({ subject, topics }));
}
