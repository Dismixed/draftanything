import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5.5"),
  GEMINI_API_KEY: z.string().trim().min(1),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),
  GUEST_TOKEN_PEPPER: z.string().trim().min(32),
  APP_URL: z.url(),
});

type Environment = z.infer<typeof envSchema>;
type EnvironmentInput = Record<string, string | undefined>;

export function parseEnv(input: NodeJS.ProcessEnv): Environment;
export function parseEnv(input: EnvironmentInput): Environment;
export function parseEnv(input: EnvironmentInput) {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    throw new Error("Invalid environment");
  }

  return result.data;
}
