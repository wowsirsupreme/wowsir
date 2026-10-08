/**
 * Grade 9 Design & Technology — Question Bank
 * Cambridge IGCSE D&T 0445
 * Source: DPS International Ghana Annual Syllabus 2026-27 + Cambridge 0445 Syllabus
 * READ-ONLY SOURCE: Lesson Plan Ultimate
 */
import type { Question } from '@/types/question';

const META = { grade: 9 as const, subject: 'Grade 9 DT (IGCSE 0445)', sourceVersion: '2026-27' };

export const gr9dtQuestions: Omit<Question, 'quizId'>[] = [

  // ── Influences on Design ─────────────────────────────────────────
  {
    id: 'gr9dt-influences-q001',
    topicKey: 'gr9dt-influences',
    type: 'mcq',
    text: 'Which factor best describes "ergonomics" in product design?',
    options: [
      'How attractive a product looks',
      'How a product is designed to fit and be comfortable for the human body',
      'The cost of manufacturing a product',
      'The environmental impact of a product',
    ],
    answer: '1',
    explanation: 'Ergonomics (also called human factors) is the science of designing products to fit the user\'s body comfortably and efficiently, reducing fatigue and improving usability.',
    difficulty: 'medium', points: 1, cognitiveLevel: 'understanding',
    chapter: 1, chapterTitle: 'Influences on Design',
    sourceLesson: 'gr9dt-influences',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },
  {
    id: 'gr9dt-influences-q002',
    topicKey: 'gr9dt-influences',
    type: 'mcq',
    text: 'A product specification is:',
    options: [
      'A rough sketch of a product',
      'A list of precise requirements and criteria a product must meet',
      'A bill of materials',
      'A manufacturing plan',
    ],
    answer: '1',
    explanation: 'A product specification is a detailed list of requirements (size, weight, material, cost, performance) that a finished design must fulfil. It acts as a benchmark for evaluation.',
    difficulty: 'medium', points: 1, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-influences',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Materials ────────────────────────────────────────────────────
  {
    id: 'gr9dt-materials-q001',
    topicKey: 'gr9dt-materials',
    type: 'mcq',
    text: 'Which material property describes how well a material can be stretched without breaking?',
    options: ['Hardness', 'Compressive strength', 'Ductility', 'Brittleness'],
    answer: '2',
    explanation: 'Ductility is the ability of a material to be stretched into a wire or thin sheet without fracturing. Copper and gold are highly ductile metals.',
    difficulty: 'medium', points: 1, cognitiveLevel: 'recall',
    sourceLesson: 'gr9dt-materials',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },
  {
    id: 'gr9dt-materials-q002',
    topicKey: 'gr9dt-materials',
    type: 'mcq',
    text: 'Thermoplastics differ from thermosetting plastics because thermoplastics:',
    options: [
      'Cannot be melted once set',
      'Can be repeatedly heated and reshaped without permanent chemical change',
      'Are always harder than thermosetting plastics',
      'Are made from natural materials',
    ],
    answer: '1',
    explanation: 'Thermoplastics (e.g. PET, nylon, acrylic) soften when heated and can be reshaped multiple times. Thermosetting plastics (e.g. epoxy, melamine) permanently harden and cannot be remelted.',
    difficulty: 'hard', points: 2, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-materials',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Design Brief & Research ──────────────────────────────────────
  {
    id: 'gr9dt-design-brief-q001',
    topicKey: 'gr9dt-design-brief',
    type: 'mcq',
    text: 'What is the purpose of a DESIGN BRIEF?',
    options: [
      'To show the final finished product',
      'To clearly state the problem to be solved and the target user',
      'To list the tools needed',
      'To calculate the cost of materials',
    ],
    answer: '1',
    explanation: 'A design brief is a clear, concise statement of the design problem, who the product is for (target market), and the overall goals — it guides all subsequent design activity.',
    difficulty: 'easy', points: 1, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-design-brief',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Developing Ideas ─────────────────────────────────────────────
  {
    id: 'gr9dt-developing-q001',
    topicKey: 'gr9dt-developing',
    type: 'mcq',
    text: 'Annotation on a design sketch means:',
    options: [
      'Shading the sketch with colour',
      'Adding written notes and labels to explain specific features of the design',
      'Making the sketch larger',
      'Tracing the sketch on another paper',
    ],
    answer: '1',
    explanation: 'Annotations are written notes added to a sketch to explain materials, dimensions, colours, processes, or how a specific feature works. They communicate design thinking.',
    difficulty: 'easy', points: 1, cognitiveLevel: 'recall',
    sourceLesson: 'gr9dt-developing',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Evaluation ───────────────────────────────────────────────────
  {
    id: 'gr9dt-evaluation-q001',
    topicKey: 'gr9dt-evaluation',
    type: 'mcq',
    text: 'When evaluating a finished product against a design specification, you should:',
    options: [
      'Only consider how good it looks',
      'Check each specification point and state whether the product meets, partially meets, or does not meet it — with justification',
      'Change the specification to match what was made',
      'Ask a friend if they like it',
    ],
    answer: '1',
    explanation: 'Product evaluation compares the finished product against every point in the design specification. For each criterion, state whether it was met and provide evidence or measurements as justification.',
    difficulty: 'medium', points: 1, cognitiveLevel: 'analysis',
    sourceLesson: 'gr9dt-evaluation',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Manufacturing & Processes ────────────────────────────────────
  {
    id: 'gr9dt-manufacturing-q001',
    topicKey: 'gr9dt-manufacturing',
    type: 'mcq',
    text: 'What is a prototype in the design process?',
    options: [
      'The final mass-produced product',
      'An early working model made to test and refine a design before full production',
      'A detailed technical drawing',
      'A list of materials',
    ],
    answer: '1',
    explanation: 'A prototype is a working model used to test the design\'s form, function, and feasibility. It allows designers to identify problems and make improvements before committing to full production.',
    difficulty: 'easy', points: 1, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-manufacturing',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },
  {
    id: 'gr9dt-manufacturing-q002',
    topicKey: 'gr9dt-manufacturing',
    type: 'mcq',
    text: 'Computer-Aided Design (CAD) software is used by designers to:',
    options: [
      'Manufacture products automatically',
      'Create accurate 2D drawings and 3D models of products on a computer',
      'Market and sell products online',
      'Order materials from suppliers',
    ],
    answer: '1',
    explanation: 'CAD software (e.g. AutoCAD, Fusion 360) allows designers to create precise 2D and 3D digital models that can be tested, modified, and sent directly to CNC machines or 3D printers.',
    difficulty: 'easy', points: 1, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-manufacturing',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Health & Safety ──────────────────────────────────────────────
  {
    id: 'gr9dt-health-safety-q001',
    topicKey: 'gr9dt-health-safety',
    type: 'mcq',
    text: 'Why is it important to wear safety goggles when using power tools or chemicals?',
    options: [
      'They improve vision',
      'They protect the eyes from flying debris, sparks, or splashes that could cause serious injury',
      'They are required by fashion',
      'They reduce noise',
    ],
    answer: '1',
    explanation: 'Safety goggles protect the eyes — one of the most vulnerable parts of the body in workshop environments — from flying particles, sharp fragments, chemical splashes, and UV light.',
    difficulty: 'easy', points: 1, cognitiveLevel: 'understanding',
    sourceLesson: 'gr9dt-health-safety',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Mechanisms ───────────────────────────────────────────────────
  {
    id: 'gr9dt-mechanisms-q001',
    topicKey: 'gr9dt-mechanisms',
    type: 'mcq',
    text: 'A gear system where a small gear drives a large gear will:',
    options: [
      'Increase speed and decrease torque',
      'Decrease speed and increase torque (turning force)',
      'Keep speed and torque the same',
      'Only change the direction of rotation',
    ],
    answer: '1',
    explanation: 'When a small gear (driver) meshes with a large gear (driven), the output rotates slower but with more torque (turning force). This is used in vehicles when climbing hills.',
    difficulty: 'hard', points: 2, cognitiveLevel: 'application',
    sourceLesson: 'gr9dt-mechanisms',
    approvalStatus: 'pending', source: 'builtin', ...META,
  },

  // ── Design Brief & Specification (extra) ──────────────────────────
  {
    id: 'gr9dt-design-brief-q002', topicKey: 'gr9dt-design-brief', type: 'mcq',
    text: 'What is a design brief?',
    options: ['A finished product prototype','A short document that outlines the problem, the client\'s requirements, and the context for a design task','A list of tools needed for manufacturing','A report written after testing a product'],
    answer: '1', explanation: 'A design brief defines the design problem, target user, context, and key requirements. It is the starting point for the design process.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Design Brief & Specification',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-design-brief-q003', topicKey: 'gr9dt-design-brief', type: 'mcq',
    text: 'What is a design specification?',
    options: ['A picture of the final product','A detailed list of measurable criteria a product must meet (e.g. size, weight, cost, materials, aesthetics)','The manufacturing instructions','An evaluation checklist'],
    answer: '1', explanation: 'A specification lists specific, testable requirements: dimensions, weight limits, cost, safety standards, aesthetic requirements, and environmental considerations.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Design Brief & Specification',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-design-brief-q004', topicKey: 'gr9dt-design-brief', type: 'truefalse',
    text: 'A design specification should include criteria that can be measured and tested against the final product.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Good specification criteria are SMART: Specific, Measurable, Achievable, Relevant, Time-bound. "Must weigh less than 200g" is measurable; "must be good" is not.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Design Brief & Specification',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-design-brief-q005', topicKey: 'gr9dt-design-brief', type: 'mcq',
    text: 'What is the purpose of market research in the design process?',
    options: ['To calculate the cost of manufacturing','To understand user needs, existing products, and market gaps so the design effectively meets real needs','To draw technical drawings','To choose which materials to use'],
    answer: '1', explanation: 'Market research (surveys, observation, interviews) informs the brief by revealing what users want, what competitors offer, and what problems remain unsolved.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Design Brief & Specification',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-design-brief-q006', topicKey: 'gr9dt-design-brief', type: 'mcq',
    text: 'What is ergonomics in product design?',
    options: ['Choosing eco-friendly materials','Designing products to fit the human body comfortably and efficiently, reducing strain and improving usability','Calculating the strength of a structure','Using recycled materials only'],
    answer: '1', explanation: 'Ergonomics considers the human body\'s dimensions and capabilities to design products that are comfortable and efficient to use (e.g. chair height, handle grip size).',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Design Brief & Specification',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Developing Design Ideas (extra) ───────────────────────────────
  {
    id: 'gr9dt-developing-q002', topicKey: 'gr9dt-developing', type: 'mcq',
    text: 'What is the purpose of sketching initial design ideas?',
    options: ['To produce the final production drawings','To quickly explore and communicate a range of possible design solutions before committing to one','To calculate material costs','To produce a working prototype'],
    answer: '1', explanation: 'Initial sketches (concept drawings) quickly explore multiple possibilities. Sketching is fast, cheap, and allows creative exploration without commitment.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Developing Design Ideas',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-developing-q003', topicKey: 'gr9dt-developing', type: 'mcq',
    text: 'What is a prototype in design and technology?',
    options: ['The final mass-produced product','A working model or early version of a product built to test ideas, identify problems, and gather feedback before final production','A detailed technical drawing','A list of materials needed'],
    answer: '1', explanation: 'A prototype is an early sample built to test design ideas and functionality. It may be low-fidelity (card model) or high-fidelity (functional model).',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Developing Design Ideas',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-developing-q004', topicKey: 'gr9dt-developing', type: 'mcq',
    text: 'What does an orthographic drawing show?',
    options: ['A 3D perspective view of an object','Three separate 2D views (front, side, top) of an object drawn to scale to precisely communicate dimensions','A freehand artistic sketch','A cross-section through a material'],
    answer: '1', explanation: 'Orthographic (working drawings) show multiple flat views (elevation, plan, end view) with dimensions, allowing manufacturers to build exactly to specification.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Developing Design Ideas',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-developing-q005', topicKey: 'gr9dt-developing', type: 'truefalse',
    text: 'A mood board helps communicate the intended aesthetic style of a product to clients and team members.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. A mood board collects images, colours, textures, and typography that capture the visual direction and feel intended for the product.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Developing Design Ideas',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Materials & Components (extra) ────────────────────────────────
  {
    id: 'gr9dt-materials-q003', topicKey: 'gr9dt-materials', type: 'mcq',
    text: 'What is the difference between thermoplastic and thermosetting plastic?',
    options: ['Thermoplastics are stronger','Thermoplastics can be re-melted and reshaped when heated; thermosetting plastics permanently set their shape when cured and cannot be re-melted','Thermosetting plastics are transparent','Thermoplastics are biodegradable'],
    answer: '1', explanation: 'Thermoplastics (PET, nylon) soften when heated — recyclable. Thermosets (epoxy resin, Bakelite) form cross-links when cured and cannot be re-melted.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Materials & Components',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-materials-q004', topicKey: 'gr9dt-materials', type: 'mcq',
    text: 'What does tensile strength mean for a material?',
    options: ['The ability to conduct electricity','The ability to resist being stretched or pulled apart without breaking','The hardness of a material\'s surface','How well a material conducts heat'],
    answer: '1', explanation: 'Tensile strength is the maximum stress a material can withstand while being stretched before it breaks. Steel has very high tensile strength.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Materials & Components',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-materials-q005', topicKey: 'gr9dt-materials', type: 'mcq',
    text: 'What is a composite material?',
    options: ['A material made from a single pure element','A material made from two or more constituent materials with different properties that, when combined, produce a material with superior properties','A naturally occurring material found in the earth','A material that is completely biodegradable'],
    answer: '1', explanation: 'Composites combine materials — e.g. carbon fibre reinforced polymer (CFRP) is lightweight and very strong. Glass fibre (fibreglass) is another example.',
    difficulty: 'hard', points: 2, chapter: 0, chapterTitle: 'Materials & Components',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-materials-q006', topicKey: 'gr9dt-materials', type: 'truefalse',
    text: 'Selecting a sustainable material means considering its environmental impact throughout its life cycle — extraction, manufacturing, use, and disposal.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Life Cycle Assessment (LCA) evaluates environmental impact at each stage. Sustainable choices minimise resource use, energy, and waste.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Materials & Components',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Manufacturing Processes (extra) ───────────────────────────────
  {
    id: 'gr9dt-manufacturing-q003', topicKey: 'gr9dt-manufacturing', type: 'mcq',
    text: 'What is a jig in manufacturing?',
    options: ['A type of saw blade','A device that guides a tool to ensure consistent, accurate cuts or holes in repeated production','A type of adhesive','An electronic testing device'],
    answer: '1', explanation: 'A jig guides a cutting tool (drill, saw) and can be re-used to ensure identical results across many workpieces — reducing errors and improving efficiency.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Manufacturing Processes',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-manufacturing-q004', topicKey: 'gr9dt-manufacturing', type: 'mcq',
    text: 'What is CNC (Computer Numerical Control) machining?',
    options: ['Manual cutting of materials by hand','Using computer-programmed instructions to automatically control the movement of cutting tools for precise, repeatable manufacturing','A type of glue used in manufacturing','A measurement standard'],
    answer: '1', explanation: 'CNC machines follow G-code programs to control movement of mills, lathes, and routers with high precision and repeatability without manual operation.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Manufacturing Processes',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-manufacturing-q005', topicKey: 'gr9dt-manufacturing', type: 'truefalse',
    text: '3D printing (additive manufacturing) builds objects by adding material layer by layer.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Additive manufacturing adds material (plastic, metal powder) layer by layer from a 3D CAD file — the opposite of subtractive processes like milling.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Manufacturing Processes',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-manufacturing-q006', topicKey: 'gr9dt-manufacturing', type: 'mcq',
    text: 'What is the difference between one-off and batch production?',
    options: ['There is no difference','One-off makes a single unique item; batch production makes a set quantity of identical items before the production line is changed for a different product','Batch production makes one item at a time','One-off production is always automated'],
    answer: '1', explanation: 'One-off: unique custom products (e.g. a bespoke suit). Batch: a set quantity (e.g. 1,000 t-shirts of one colour). Mass production: continuous identical items (e.g. bottles).',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Manufacturing Processes',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Mechanisms & Systems (extra) ──────────────────────────────────
  {
    id: 'gr9dt-mechanisms-q002', topicKey: 'gr9dt-mechanisms', type: 'mcq',
    text: 'What is a gear ratio?',
    options: ['The weight of a gear','The ratio of the number of teeth on the driven gear to the number of teeth on the driving gear, determining speed and torque change','The material a gear is made from','The size of the gear in millimetres'],
    answer: '1', explanation: 'Gear ratio = driven teeth ÷ driving teeth. A 2:1 ratio halves the speed but doubles the torque. Used to control speed and force in machines.',
    difficulty: 'hard', points: 2, chapter: 0, chapterTitle: 'Mechanisms & Systems',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-mechanisms-q003', topicKey: 'gr9dt-mechanisms', type: 'mcq',
    text: 'What does a pulley system do?',
    options: ['Converts rotary to linear motion','Redirects force and can multiply force using a rope and wheel system, making it easier to lift heavy loads','Stores electrical energy','Controls the speed of a motor'],
    answer: '1', explanation: 'Pulleys redirect force (a single pulley) or provide mechanical advantage (block and tackle) to reduce the effort needed to lift a load.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Mechanisms & Systems',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-mechanisms-q004', topicKey: 'gr9dt-mechanisms', type: 'mcq',
    text: 'What is a cam-and-follower mechanism used for?',
    options: ['Changing the direction of rotation','Converting rotary motion into reciprocating (up-and-down) linear motion','Storing electrical charge','Increasing gear speed'],
    answer: '1', explanation: 'A cam is an off-centre or irregularly shaped rotating wheel. As it turns, the follower (in contact with it) moves up and down — used in engines and sewing machines.',
    difficulty: 'hard', points: 2, chapter: 0, chapterTitle: 'Mechanisms & Systems',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-mechanisms-q005', topicKey: 'gr9dt-mechanisms', type: 'truefalse',
    text: 'A lever is a simple machine that can multiply force, with the pivot point called the fulcrum.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. A lever amplifies input force. The mechanical advantage depends on where the fulcrum is relative to the load and effort. Example: a crowbar or seesaw.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Mechanisms & Systems',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Influences on Design (extra) ──────────────────────────────────
  {
    id: 'gr9dt-influences-q003', topicKey: 'gr9dt-influences', type: 'mcq',
    text: 'What is sustainable design?',
    options: ['Designing products that look futuristic','Designing products that minimise environmental impact through reduced material use, longer lifespan, recyclability, and efficient production','Designing with only one material type','Designing products made entirely by hand'],
    answer: '1', explanation: 'Sustainable design (also called green design) considers the full life cycle to minimise negative environmental impact and conserve resources for future generations.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Influences on Design',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-influences-q004', topicKey: 'gr9dt-influences', type: 'mcq',
    text: 'How does culture influence product design?',
    options: ['It only affects the colour of products','Cultural values, traditions, aesthetics, and norms shape what is desirable, acceptable, and functional for a target market','Culture never influences functional design','Products are designed identically for all cultures'],
    answer: '1', explanation: 'Cultural factors affect colour symbolism, materials considered acceptable, aesthetic preferences, and functional needs — a product successful in one culture may fail in another.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Influences on Design',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-influences-q005', topicKey: 'gr9dt-influences', type: 'truefalse',
    text: 'Planned obsolescence is when a product is intentionally designed with a limited lifespan to encourage consumers to buy replacements.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Planned obsolescence (e.g. fashion cycles, smartphone updates) is controversial because it generates profit but also waste.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Influences on Design',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Evaluation & Testing (extra) ──────────────────────────────────
  {
    id: 'gr9dt-evaluation-q002', topicKey: 'gr9dt-evaluation', type: 'mcq',
    text: 'What is the purpose of evaluating a design against the specification?',
    options: ['To calculate how much the product costs','To compare the final product\'s performance and attributes against the original specification criteria to identify successes and areas for improvement','To advertise the product','To decide which colour to paint it'],
    answer: '1', explanation: 'Evaluating against the spec gives objective evidence of whether design goals were met. Criteria not met guide redesign decisions.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Evaluation & Testing',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-evaluation-q003', topicKey: 'gr9dt-evaluation', type: 'mcq',
    text: 'What is user testing?',
    options: ['Testing the product yourself in a lab','Having target users try the product in realistic conditions and collecting their feedback to identify usability issues','Testing the materials for strength','Checking the product meets legal safety standards'],
    answer: '1', explanation: 'User testing involves the intended audience trying the product and providing feedback. It reveals usability issues that designers may not foresee.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Evaluation & Testing',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-evaluation-q004', topicKey: 'gr9dt-evaluation', type: 'truefalse',
    text: 'Design is an iterative process, meaning you can improve your design based on testing and evaluation feedback.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Iterative design cycles (test → evaluate → improve → test again) lead to progressively better solutions.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Evaluation & Testing',
    approvalStatus: 'pending', source: 'builtin',
  },

  // ── Health & Safety (extra) ────────────────────────────────────────
  {
    id: 'gr9dt-health-safety-q002', topicKey: 'gr9dt-health-safety', type: 'mcq',
    text: 'What is PPE in a workshop context?',
    options: ['Personal Programming Equipment','Personal Protective Equipment — safety gear (goggles, gloves, aprons, ear defenders) worn to protect the user from workshop hazards','Product Performance Evaluation','Prototype Production Equipment'],
    answer: '1', explanation: 'PPE includes safety glasses, hearing protection, dust masks, gloves, and aprons. It is the last line of defence against workshop hazards.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Health & Safety',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-health-safety-q003', topicKey: 'gr9dt-health-safety', type: 'mcq',
    text: 'What is a risk assessment?',
    options: ['A record of the tools used in a project','A systematic process of identifying hazards, evaluating the likelihood and severity of harm, and putting controls in place to reduce risk','A list of materials and their costs','A quality control checklist'],
    answer: '1', explanation: 'A risk assessment: identify the hazard → who might be harmed → how likely/severe → what controls can reduce risk. Required before workshop activities.',
    difficulty: 'medium', points: 1, chapter: 0, chapterTitle: 'Health & Safety',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-health-safety-q004', topicKey: 'gr9dt-health-safety', type: 'truefalse',
    text: 'Long hair and loose clothing should always be tied back when working with rotating machinery.',
    options: ['True', 'False'],
    answer: '0', explanation: 'True. Long hair and loose clothing can become caught in moving parts, causing serious injury. This is a basic workshop safety rule.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Health & Safety',
    approvalStatus: 'pending', source: 'builtin',
  },
  {
    id: 'gr9dt-health-safety-q005', topicKey: 'gr9dt-health-safety', type: 'mcq',
    text: 'Why is it important to clamp or secure a workpiece before cutting or drilling?',
    options: ['To make the workpiece look neater','To prevent the workpiece from moving unexpectedly, which could cause injury or damage the material','To improve the colour of the material','To make it easier to measure'],
    answer: '1', explanation: 'An unsecured workpiece can move or spin under cutting/drilling forces, causing the tool to slip — a major cause of workshop injuries.',
    difficulty: 'easy', points: 1, chapter: 0, chapterTitle: 'Health & Safety',
    approvalStatus: 'pending', source: 'builtin',
  },

];
