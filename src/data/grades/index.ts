/**
 * Grade Question Banks — Barrel Export
 * All grades: 4, 5, 6, 7, 8, 9 CS (IGCSE 0478), 9 DT (IGCSE 0445),
 *             10 CS (IGCSE 0478 Year 2), 11 CS (A-Level 9618)
 *
 * Usage:
 *   import { allGradeQuestions } from '@/data/grades';
 *   import { gr7Questions } from '@/data/grades';
 */

export { gr4Questions } from './gr4';
export { gr5Questions } from './gr5';
export { gr6Questions } from './gr6';
export { gr7Questions } from './gr7';
export { gr8Questions } from './gr8';
export { gr9csQuestions } from './gr9cs';
export { gr9dtQuestions } from './gr9dt';
export { gr10csQuestions } from './gr10cs';
export { gr11csQuestions } from './gr11cs';

// Convenience: all questions in one flat array
import { gr4Questions } from './gr4';
import { gr5Questions } from './gr5';
import { gr6Questions } from './gr6';
import { gr7Questions } from './gr7';
import { gr8Questions } from './gr8';
import { gr9csQuestions } from './gr9cs';
import { gr9dtQuestions } from './gr9dt';
import { gr10csQuestions } from './gr10cs';
import { gr11csQuestions } from './gr11cs';

export const allGradeQuestions = [
  ...gr4Questions,
  ...gr5Questions,
  ...gr6Questions,
  ...gr7Questions,
  ...gr8Questions,
  ...gr9csQuestions,
  ...gr9dtQuestions,
  ...gr10csQuestions,
  ...gr11csQuestions,
];
