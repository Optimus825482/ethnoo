import { z } from "zod";

const placeholder = z.string().refine(
  (value) => !value.includes("CHANGE_ME"),
  "CHANGE_ME placeholders are forbidden",
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: placeholder.pipe(z.url()),
  NEXTAUTH_SECRET: placeholder.min(32).optional(),
  NEXTAUTH_URL: z.url().optional(),
  SETUP_SECRET: placeholder.min(32),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  VAPID_PUBLIC_KEY: placeholder.min(1),
  VAPID_PRIVATE_KEY: placeholder.min(1),
  VAPID_CONTACT_EMAIL: z.email(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && !value.NEXTAUTH_SECRET) {
    ctx.addIssue({ code: "custom", path: ["NEXTAUTH_SECRET"], message: "Required in production" });
  }
});

type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${z.prettifyError(parsed.error)}`);
  }
  return cached = parsed.data;
}
