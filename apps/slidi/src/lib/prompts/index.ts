// src/lib/prompts/index.ts
export {
  BASE_PROMPT,
  SYSTEM_PROMPT,
  buildPrompt,
  buildPlanningPrompt,
  buildRepairPrompt,
  buildUserContextBlock,
  buildPresentationModeBlock,
  buildContextPrefix,
  buildPersonaBlock,
  buildDesignBriefBlock,
  buildAttachedFilesBlock,
} from './builders';

export type { AttachedFile } from './builders';

export {
  buildPlanModeSystemPrompt,
  buildQuestionGenerationPrompt,
  buildOutlineFromAnswersPrompt,
  parsePlanResponse,
  parseQuestions,
} from './planning';

export type { PlanResponse } from './planning';
