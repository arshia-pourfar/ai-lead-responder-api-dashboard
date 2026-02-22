import prisma from "@/lib/prisma";
import { detectCategory } from "@/lib/services/classifier";
import { sendAutoReplyDetailed } from "@/lib/services/email";
import { analyzeLead } from "@/lib/services/gemini";
import { markEmailAsSeenByUid } from "@/lib/services/readEmail";
import type { Email as ImapEmail } from "@/lib/services/readEmail";

const DUPLICATE_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_AUTO_PROCESS = 100;
const DEFAULT_MAX_AUTO_SEND = 100;

interface AutoReplyRow {
    id: string;
    senderEmail: string | null;
    manualReply: string | null;
    aiReply: string | null;
    category: string;
    status: string;
    readyToSend: boolean;
}

export interface AutoPrepareUnreadOptions {
    autoSendReadyEmails: boolean;
    maxToProcess?: number;
}

export interface AutoPrepareUnreadResult {
    preparedCount: number;
    sentCount: number;
    skippedCount: number;
    errors: string[];
}

export interface AutoSendReadyResult {
    sentCount: number;
    skippedCount: number;
    errors: string[];
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pickFinalReply(manualReply: string | null, aiReply: string | null): string {
    const manual = (manualReply || "").trim();
    if (manual) return manual;
    return (aiReply || "").trim();
}

async function sendPreparedEmail(
    userId: string,
    email: AutoReplyRow
): Promise<{ sent: boolean; reason?: string }> {
    if (email.status === "sent" && !email.readyToSend) {
        return { sent: false, reason: "Already sent" };
    }

    const recipient = (email.senderEmail || "").trim();
    if (!isValidEmail(recipient)) {
        return { sent: false, reason: "Recipient email is missing or invalid" };
    }

    const finalReply = pickFinalReply(email.manualReply, email.aiReply);
    if (!finalReply) {
        return { sent: false, reason: "Reply text cannot be empty" };
    }

    const sendResult = await sendAutoReplyDetailed(
        recipient,
        finalReply,
        email.category || "general",
        userId,
        { allowWhenAutoEmailDisabled: true }
    );

    if (!sendResult.success) {
        return { sent: false, reason: sendResult.error || "Email send failed" };
    }

    await prisma.email.update({
        where: { id: email.id },
        data: {
            status: "sent",
            tag: "sent",
            readyToSend: false,
        },
    });

    return { sent: true };
}

async function findPotentialDuplicate(
    userId: string,
    subject: string,
    body: string,
    senderEmail: string
): Promise<AutoReplyRow | null> {
    const createdAfter = new Date(Date.now() - DUPLICATE_LOOKBACK_MS);

    return prisma.email.findFirst({
        where: {
            userId,
            subject,
            body,
            senderEmail,
            createdAt: { gte: createdAfter },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            senderEmail: true,
            manualReply: true,
            aiReply: true,
            category: true,
            status: true,
            readyToSend: true,
        },
    });
}

export async function autoPrepareUnreadEmails(
    userId: string,
    unreadEmails: ImapEmail[],
    options: AutoPrepareUnreadOptions
): Promise<AutoPrepareUnreadResult> {
    const maxToProcess = Number.isFinite(options.maxToProcess)
        ? Math.max(1, Math.floor(options.maxToProcess || 0))
        : DEFAULT_MAX_AUTO_PROCESS;

    const result: AutoPrepareUnreadResult = {
        preparedCount: 0,
        sentCount: 0,
        skippedCount: 0,
        errors: [],
    };

    for (const unreadEmail of unreadEmails.slice(0, maxToProcess)) {
        const uid = Number.isFinite(unreadEmail.uid) ? unreadEmail.uid : 0;
        if (!uid) {
            result.skippedCount += 1;
            result.errors.push("Skipped unread email without valid uid.");
            continue;
        }

        const subject = (unreadEmail.subject || "(No Subject)").trim() || "(No Subject)";
        const body = (unreadEmail.text || "").trim();
        const sender = (unreadEmail.from || "").trim().toLowerCase();

        if (!sender) {
            result.skippedCount += 1;
            result.errors.push(`Skipped uid ${uid}: sender is missing.`);
            continue;
        }

        try {
            const duplicate = await findPotentialDuplicate(userId, subject, body, sender);
            if (duplicate) {
                try {
                    await markEmailAsSeenByUid(uid, userId);
                } catch (markError) {
                    const markMessage =
                        markError instanceof Error ? markError.message : String(markError);
                    result.errors.push(
                        `Failed to mark duplicate uid ${uid} as seen: ${markMessage}`
                    );
                }

                if (options.autoSendReadyEmails) {
                    try {
                        const sendResult = await sendPreparedEmail(userId, duplicate);
                        if (sendResult.sent) {
                            result.sentCount += 1;
                        } else if (sendResult.reason !== "Already sent") {
                            result.errors.push(
                                `Duplicate email ${duplicate.id} not sent: ${sendResult.reason || "Unknown error"}`
                            );
                        }
                    } catch (sendError) {
                        const message =
                            sendError instanceof Error ? sendError.message : String(sendError);
                        result.errors.push(`Failed auto-send for duplicate ${duplicate.id}: ${message}`);
                    }
                }

                result.skippedCount += 1;
                continue;
            }

            const detectedCategory = await detectCategory(body || subject, userId);
            const analyzed = await analyzeLead(detectedCategory, body || subject, userId);
            const generatedReply = (analyzed.reply || "").trim() || "Thanks for reaching out!";

            const created = await prisma.email.create({
                data: {
                    subject,
                    body,
                    aiReply: generatedReply,
                    manualReply: generatedReply,
                    category: detectedCategory,
                    status: "ready_send",
                    tag: "read",
                    readyToSend: true,
                    readyToSell: detectedCategory === "sales",
                    userId,
                    senderEmail: sender,
                },
                select: {
                    id: true,
                    senderEmail: true,
                    manualReply: true,
                    aiReply: true,
                    category: true,
                    status: true,
                    readyToSend: true,
                },
            });

            try {
                await markEmailAsSeenByUid(uid, userId);
            } catch (markError) {
                const markMessage =
                    markError instanceof Error ? markError.message : String(markError);
                result.errors.push(`Prepared email ${created.id} but failed to mark seen: ${markMessage}`);
            }

            result.preparedCount += 1;

            if (options.autoSendReadyEmails) {
                const sendResult = await sendPreparedEmail(userId, created);
                if (sendResult.sent) {
                    result.sentCount += 1;
                } else {
                    result.errors.push(
                        `Prepared email ${created.id} not sent: ${sendResult.reason || "Unknown error"}`
                    );
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`Failed automation for uid ${uid}: ${message}`);
        }
    }

    return result;
}

export async function autoSendPendingReadyEmails(
    userId: string,
    maxToSend = DEFAULT_MAX_AUTO_SEND
): Promise<AutoSendReadyResult> {
    const safeLimit = Number.isFinite(maxToSend)
        ? Math.max(1, Math.floor(maxToSend))
        : DEFAULT_MAX_AUTO_SEND;

    const pendingEmails = await prisma.email.findMany({
        where: {
            userId,
            OR: [{ readyToSend: true }, { status: "ready_send" }],
            NOT: { status: "sent" },
        },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        select: {
            id: true,
            senderEmail: true,
            manualReply: true,
            aiReply: true,
            category: true,
            status: true,
            readyToSend: true,
        },
    });

    const result: AutoSendReadyResult = {
        sentCount: 0,
        skippedCount: 0,
        errors: [],
    };

    for (const email of pendingEmails) {
        try {
            const sendResult = await sendPreparedEmail(userId, email);
            if (sendResult.sent) {
                result.sentCount += 1;
            } else if (sendResult.reason === "Already sent") {
                result.skippedCount += 1;
            } else {
                result.skippedCount += 1;
                result.errors.push(
                    `Ready email ${email.id} not sent: ${sendResult.reason || "Unknown error"}`
                );
            }
        } catch (error) {
            result.skippedCount += 1;
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`Failed auto-send for ready email ${email.id}: ${message}`);
        }
    }

    return result;
}
