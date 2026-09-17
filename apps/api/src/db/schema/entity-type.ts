export const ENTITY_TYPES = [
  'usage',
  'activity',
  'relation',
  'attribution_link',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
