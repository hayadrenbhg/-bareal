export const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'muscle', emoji: '💪', label: 'Muscle' },
  { type: 'thumbs_up', emoji: '👍', label: 'Nice' },
] as const;

export type ReactionType = (typeof REACTIONS)[number]['type'];

export function getReactionEmoji(type: string): string {
  return REACTIONS.find((r) => r.type === type)?.emoji ?? '👍';
}
