import prisma from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const GMAIL_APP_PASSWORD_LENGTH = 16;
const HASH_ROUNDS = 12;
const DEV_FALLBACK_ENCRYPTION_KEY = "local-dev-email-credentials-key";
const EMAIL_CREDENTIAL_DIAGNOSTICS =
    (process.env.EMAIL_CREDENTIAL_DIAGNOSTICS || "").toLowerCase() === "true";
let hasLoggedFallbackKeyWarning = false;

function diagnosticsLog(message: string, payload?: Record<string, unknown>): void {
    if (!EMAIL_CREDENTIAL_DIAGNOSTICS) return;
    if (payload) {
        console.log(`[emailCredentials] ${message}`, payload);
        return;
    }
    console.log(`[emailCredentials] ${message}`);
}

interface UserCredentialRow {
    id: string;
    email: string;
    emailAddress: string | null;
    emailAppPasswordHash: string | null;
    emailAppPasswordEncrypted: string | null;
}

export interface UserEmailSettings {
    registrationEmail: string;
    useRegistrationEmail: boolean;
    emailAddress: string;
    hasAppPassword: boolean;
}

export interface ResolvedEmailCredentials {
    emailAddress: string;
    appPassword: string;
    source: "user" | "env";
}

interface SaveUserEmailSettingsInput {
    userId: string;
    useRegistrationEmail?: boolean;
    emailAddress?: string;
    appPassword?: string;
}

function isMissingColumnError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes("column") && message.includes("does not exist");
}

function isValidEmailAddress(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmailAddress(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeAppPassword(value: string): string {
    return value.replace(/\s+/g, "").trim();
}

function validateAppPassword(value: string): boolean {
    return value.length === GMAIL_APP_PASSWORD_LENGTH;
}

function getEncryptionKey(): Buffer {
    const secretCandidates = [
        process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY,
        process.env.JWT_SECRET,
        process.env.AUTH_SECRET,
        process.env.NEXTAUTH_SECRET,
    ];
    const secret = secretCandidates.find((value) => typeof value === "string" && value.trim() !== "") || "";

    if (!secret) {
        if (process.env.NODE_ENV !== "production") {
            if (!hasLoggedFallbackKeyWarning) {
                console.warn(
                    "Using development fallback for email credential encryption. Set EMAIL_CREDENTIALS_ENCRYPTION_KEY for secure persistence."
                );
                hasLoggedFallbackKeyWarning = true;
            }
            return createHash("sha256").update(DEV_FALLBACK_ENCRYPTION_KEY).digest();
        }

        throw new Error(
            "Set EMAIL_CREDENTIALS_ENCRYPTION_KEY (or JWT_SECRET/AUTH_SECRET/NEXTAUTH_SECRET) in production"
        );
    }

    return createHash("sha256").update(secret).digest();
}

function encryptSecret(plainText: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptSecret(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error("Invalid encrypted credential payload");
    }

    const key = getEncryptionKey();
    const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, "base64")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

async function getUserCredentialRow(userId: string): Promise<UserCredentialRow | null> {
    try {
        const rows = await prisma.$queryRaw<UserCredentialRow[]>`
            SELECT
                id,
                email,
                "emailAddress",
                "emailAppPasswordHash",
                "emailAppPasswordEncrypted"
            FROM "User"
            WHERE id = ${userId}
            LIMIT 1
        `;
        return rows[0] ?? null;
    } catch (error) {
        if (!isMissingColumnError(error)) {
            throw error;
        }

        const fallbackUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });

        if (!fallbackUser) return null;

        return {
            id: fallbackUser.id,
            email: fallbackUser.email,
            emailAddress: null,
            emailAppPasswordHash: null,
            emailAppPasswordEncrypted: null,
        };
    }
}

function buildUserEmailSettings(row: UserCredentialRow): UserEmailSettings {
    const useRegistrationEmail = !row.emailAddress;
    const effectiveEmail = useRegistrationEmail ? row.email : row.emailAddress;

    return {
        registrationEmail: row.email,
        useRegistrationEmail,
        emailAddress: effectiveEmail || row.email,
        hasAppPassword: Boolean(row.emailAppPasswordHash && row.emailAppPasswordEncrypted),
    };
}

async function resolveStoredUserCredentials(
    userId: string
): Promise<ResolvedEmailCredentials | null> {
    diagnosticsLog("resolveStoredUserCredentials:start", { userId });

    try {
        const row = await getUserCredentialRow(userId);

        diagnosticsLog("resolveStoredUserCredentials:dbRow", {
            userId,
            hasRow: Boolean(row),
            registrationEmail: row?.email || null,
            manualEmail: row?.emailAddress || null,
            hasEncrypted: Boolean(row?.emailAppPasswordEncrypted),
            hasHash: Boolean(row?.emailAppPasswordHash),
        });

        if (!row?.emailAppPasswordEncrypted || !row.emailAppPasswordHash) {
            return null;
        }

        let decryptedPassword = "";
        try {
            decryptedPassword = decryptSecret(row.emailAppPasswordEncrypted);
            diagnosticsLog("resolveStoredUserCredentials:decrypt", {
                userId,
                decryptSucceeded: true,
                decryptedLength: decryptedPassword.length,
                normalizedLength: normalizeAppPassword(decryptedPassword).length,
            });
        } catch (decryptError) {
            diagnosticsLog("resolveStoredUserCredentials:decrypt", {
                userId,
                decryptSucceeded: false,
                error:
                    decryptError instanceof Error
                        ? decryptError.message
                        : String(decryptError),
            });
            return null;
        }

        const hashMatches = await compare(decryptedPassword, row.emailAppPasswordHash);
        diagnosticsLog("resolveStoredUserCredentials:bcrypt", {
            userId,
            hashMatches,
        });

        if (!hashMatches) {
            return null;
        }

        const selectedEmail = normalizeEmailAddress(row.emailAddress || row.email);
        const validEmail = isValidEmailAddress(selectedEmail);
        diagnosticsLog("resolveStoredUserCredentials:finalEmail", {
            userId,
            selectedEmail,
            validEmail,
        });

        if (!validEmail) {
            return null;
        }

        return {
            emailAddress: selectedEmail,
            appPassword: decryptedPassword,
            source: "user",
        };
    } catch (error) {
        console.error("Failed to resolve user email credentials:", error);
    }

    return null;
}

function resolveEnvCredentials(): ResolvedEmailCredentials | null {
    const envEmail = normalizeEmailAddress(process.env.EMAIL_USER || "");
    const envPassword = normalizeAppPassword(process.env.EMAIL_PASS || "");

    diagnosticsLog("resolveEnvCredentials", {
        hasEnvEmail: Boolean(envEmail),
        hasEnvPassword: Boolean(envPassword),
        envEmail: envEmail || null,
        envPasswordLength: envPassword.length,
    });

    if (isValidEmailAddress(envEmail) && envPassword) {
        return {
            emailAddress: envEmail,
            appPassword: envPassword,
            source: "env",
        };
    }

    return null;
}

export async function resolveEmailCredentialCandidates(
    userId?: string
): Promise<ResolvedEmailCredentials[]> {
    const candidates: ResolvedEmailCredentials[] = [];

    if (userId) {
        const userCredentials = await resolveStoredUserCredentials(userId);
        if (userCredentials) {
            candidates.push(userCredentials);
        }
    }

    const envCredentials = resolveEnvCredentials();
    if (envCredentials) {
        candidates.push(envCredentials);
    }

    const unique = new Map<string, ResolvedEmailCredentials>();
    for (const candidate of candidates) {
        const key = `${candidate.emailAddress}:${candidate.appPassword}`;
        if (!unique.has(key)) {
            unique.set(key, candidate);
        }
    }

    diagnosticsLog("resolveEmailCredentialCandidates:result", {
        userId: userId || null,
        count: unique.size,
        sources: Array.from(unique.values()).map((item) => item.source),
        emails: Array.from(unique.values()).map((item) => item.emailAddress),
    });

    return Array.from(unique.values());
}

export async function getUserEmailSettings(userId: string): Promise<UserEmailSettings> {
    const row = await getUserCredentialRow(userId);
    if (!row) {
        return {
            registrationEmail: "",
            useRegistrationEmail: true,
            emailAddress: "",
            hasAppPassword: false,
        };
    }

    return buildUserEmailSettings(row);
}

export async function saveUserEmailSettings({
    userId,
    useRegistrationEmail,
    emailAddress,
    appPassword,
}: SaveUserEmailSettingsInput): Promise<UserEmailSettings> {
    const row = await getUserCredentialRow(userId);
    if (!row) {
        throw new Error("User not found");
    }

    const selectedUseRegistrationEmail = Boolean(useRegistrationEmail);
    const normalizedManualEmail = normalizeEmailAddress(emailAddress || "");
    const selectedEmail = selectedUseRegistrationEmail ? row.email : normalizedManualEmail;

    if (!isValidEmailAddress(selectedEmail)) {
        throw new Error("Valid email address is required");
    }

    const normalizedAppPassword = normalizeAppPassword(appPassword || "");
    if (normalizedAppPassword && !validateAppPassword(normalizedAppPassword)) {
        throw new Error("App password must be exactly 16 characters");
    }

    let nextHash = row.emailAppPasswordHash;
    let nextEncrypted = row.emailAppPasswordEncrypted;

    if (normalizedAppPassword) {
        nextHash = await hash(normalizedAppPassword, HASH_ROUNDS);
        nextEncrypted = encryptSecret(normalizedAppPassword);
    }

    try {
        await prisma.$executeRaw`
            UPDATE "User"
            SET
                "emailAddress" = ${selectedUseRegistrationEmail ? null : selectedEmail},
                "emailAppPasswordHash" = ${nextHash},
                "emailAppPasswordEncrypted" = ${nextEncrypted}
            WHERE id = ${userId}
        `;
    } catch (error) {
        if (isMissingColumnError(error)) {
            throw new Error(
                "Email credential columns are missing. Run the latest database migration."
            );
        }
        throw error;
    }

    const updated = await getUserCredentialRow(userId);
    if (!updated) {
        throw new Error("Failed to load saved user email settings");
    }

    return buildUserEmailSettings(updated);
}

export async function resolveUserEmailCredentials(
    userId?: string
): Promise<ResolvedEmailCredentials | null> {
    const candidates = await resolveEmailCredentialCandidates(userId);
    diagnosticsLog("resolveUserEmailCredentials:selected", {
        userId: userId || null,
        source: candidates[0]?.source || null,
        email: candidates[0]?.emailAddress || null,
    });
    return candidates[0] ?? null;
}
