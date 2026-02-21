import { z } from "zod";

const emailSchema = z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(254, "Email is too long.");

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.");

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required.").max(100, "Name is too long."),
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required."),
});

export const verifyEmailSchema = z.object({
    email: emailSchema,
    code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Verification code must be exactly 6 digits."),
});

export const resendVerificationSchema = z.object({
    email: emailSchema,
});

export function getFirstValidationError(error: z.ZodError): string {
    return error.issues[0]?.message ?? "Invalid request body.";
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
