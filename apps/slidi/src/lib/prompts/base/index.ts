// src/lib/prompts/base/index.ts
import { COMPONENT_RULES, COMPONENT_SKELETON } from './rendering';
import { ANIMATION_RULES } from './animations';
import { VISUAL_RULES } from './visuals';
import { LAYOUT_RULES } from './layout';

export const BASE_PROMPT = [
  COMPONENT_RULES,
  ANIMATION_RULES,
  VISUAL_RULES,
  LAYOUT_RULES,
  COMPONENT_SKELETON,
].join('\n\n');
