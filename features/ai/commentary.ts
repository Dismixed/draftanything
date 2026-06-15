import "server-only";

import { z } from "zod/v4";

export const COMMENTARY_PROMPT_VERSION = "v1";

export const commentaryTagSchema = z.enum([
  "reach",
  "steal",
  "trend",
  "run",
  "surprise",
]);

export const commentaryOutputSchema = z.object({
  text: z.string().min(1).max(240),
  tags: z.array(commentaryTagSchema).max(3),
});

export type CommentaryOutput = z.infer<typeof commentaryOutputSchema>;

export function makeIdempotencyKey(
  draftId: string,
  pickId: string,
): string {
  return `commentary:${draftId}:${pickId}:${COMMENTARY_PROMPT_VERSION}`;
}
