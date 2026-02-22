"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import PageHeader from "@/components/ui/Header";

type AiProvider = "gemini" | "openai" | "anthropic";

interface SettingsPayload {
    customPrompt: string;
    customCategories: string[];
    defaultCategories: string[];
    automationSettings: {
        autoApproveUnread: boolean;
        autoSendReadyEmails: boolean;
    };
    aiSettings: {
        useDefaultProvider: boolean;
        provider: AiProvider;
        hasApiKey: boolean;
    };
    emailSettings: {
        registrationEmail: string;
        useRegistrationEmail: boolean;
        emailAddress: string;
        hasAppPassword: boolean;
    };
}

export default function SettingsPage() {
    const [params, setParams] = useState<string[]>([]);
    const [newParam, setNewParam] = useState("");
    const [promptDescription, setPromptDescription] = useState("");
    const [defaultCategories, setDefaultCategories] = useState<string[]>([
        "unread",
        "ready",
        "important",
        "sent",
    ]);
    const [useDefaultAiProvider, setUseDefaultAiProvider] = useState(true);
    const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
    const [aiApiKey, setAiApiKey] = useState("");
    const [hasSavedAiApiKey, setHasSavedAiApiKey] = useState(false);
    const [autoApproveUnread, setAutoApproveUnread] = useState(false);
    const [autoSendReadyEmails, setAutoSendReadyEmails] = useState(false);

    const [registrationEmail, setRegistrationEmail] = useState("");
    const [emailAddress, setEmailAddress] = useState("");
    const [emailAppPassword, setEmailAppPassword] = useState("");
    const [hasSavedAppPassword, setHasSavedAppPassword] = useState(false);
    const [sendingResetLink, setSendingResetLink] = useState(false);
    const [resetLinkStatus, setResetLinkStatus] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const normalizeProvider = (value: unknown): AiProvider => {
        if (value === "openai" || value === "anthropic" || value === "gemini") {
            return value;
        }
        return "gemini";
    };

    const addParam = () => {
        const normalized = newParam.trim().toLowerCase();
        if (!normalized) return;
        if (params.includes(normalized)) return;
        if (defaultCategories.includes(normalized)) return;

        setParams([...params, normalized]);
        setNewParam("");
    };

    const removeParam = (index: number) => {
        setParams(params.filter((_, idx) => idx !== index));
    };

    useEffect(() => {
        let cancelled = false;

        const fetchSettings = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/settings", {
                    credentials: "include",
                    cache: "no-store",
                });

                const data: SettingsPayload = await res.json().catch(() => ({
                    customPrompt: "",
                    customCategories: [],
                    defaultCategories: ["unread", "ready", "important", "sent"],
                    automationSettings: {
                        autoApproveUnread: false,
                        autoSendReadyEmails: false,
                    },
                    aiSettings: {
                        useDefaultProvider: true,
                        provider: "gemini",
                        hasApiKey: false,
                    },
                    emailSettings: {
                        registrationEmail: "",
                        useRegistrationEmail: false,
                        emailAddress: "",
                        hasAppPassword: false,
                    },
                }));

                if (cancelled) return;
                if (!res.ok) {
                    setStatus("Could not load settings.");
                    return;
                }

                setPromptDescription(typeof data.customPrompt === "string" ? data.customPrompt : "");
                setParams(Array.isArray(data.customCategories) ? data.customCategories : []);
                setDefaultCategories(
                    Array.isArray(data.defaultCategories)
                        ? data.defaultCategories
                        : ["unread", "ready", "important", "sent"]
                );
                setUseDefaultAiProvider(data.aiSettings?.useDefaultProvider !== false);
                setAiProvider(normalizeProvider(data.aiSettings?.provider));
                setHasSavedAiApiKey(Boolean(data.aiSettings?.hasApiKey));
                setAiApiKey("");
                setAutoApproveUnread(
                    Boolean(data.automationSettings?.autoApproveUnread)
                );
                setAutoSendReadyEmails(
                    Boolean(data.automationSettings?.autoSendReadyEmails)
                );

                setRegistrationEmail(data.emailSettings?.registrationEmail || "");
                setEmailAddress(
                    data.emailSettings?.emailAddress || ""
                );
                setHasSavedAppPassword(Boolean(data.emailSettings?.hasAppPassword));
                setEmailAppPassword("");
            } catch (error) {
                console.error("Failed to load settings:", error);
                if (!cancelled) setStatus("Could not load settings.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchSettings();
        return () => {
            cancelled = true;
        };
    }, []);

    const saveSettings = async () => {
        try {
            setSaving(true);
            setStatus(null);
            setResetLinkStatus(null);

            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    customPrompt: promptDescription,
                    customCategories: params,
                    aiSettings: {
                        useDefaultProvider: useDefaultAiProvider,
                        provider: aiProvider,
                        apiKey: aiApiKey,
                    },
                    automationSettings: {
                        autoApproveUnread,
                        autoSendReadyEmails,
                    },
                    emailSettings: {
                        emailAddress,
                        appPassword: emailAppPassword,
                    },
                }),
            });

            const data: SettingsPayload | { error?: string } = await res
                .json()
                .catch(() => ({ error: "Failed to save settings" }));

            if (!res.ok) {
                throw new Error(
                    "error" in data && data.error
                        ? data.error
                        : "Failed to save settings"
                );
            }

            const payload = data as SettingsPayload;
            setPromptDescription(payload.customPrompt || "");
            setParams(
                Array.isArray(payload.customCategories) ? payload.customCategories : []
            );
            setDefaultCategories(
                Array.isArray(payload.defaultCategories)
                    ? payload.defaultCategories
                    : ["unread", "ready", "important", "sent"]
            );
            setUseDefaultAiProvider(payload.aiSettings?.useDefaultProvider !== false);
            setAiProvider(normalizeProvider(payload.aiSettings?.provider));
            setHasSavedAiApiKey(Boolean(payload.aiSettings?.hasApiKey));
            setAiApiKey("");
            setAutoApproveUnread(
                Boolean(payload.automationSettings?.autoApproveUnread)
            );
            setAutoSendReadyEmails(
                Boolean(payload.automationSettings?.autoSendReadyEmails)
            );

            setRegistrationEmail(payload.emailSettings?.registrationEmail || "");
            setEmailAddress(
                payload.emailSettings?.emailAddress || ""
            );
            setHasSavedAppPassword(Boolean(payload.emailSettings?.hasAppPassword));
            setEmailAppPassword("");
            setStatus("Settings saved.");
        } catch (error) {
            console.error("Failed to save settings:", error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "Could not save settings.";
            setStatus(message);
        } finally {
            setSaving(false);
        }
    };

    const sendResetPasswordLink = async () => {
        const targetEmail = (
            registrationEmail ||
            emailAddress ||
            ""
        ).trim();

        if (!targetEmail) {
            setResetLinkStatus("No account email found to send reset link.");
            return;
        }

        try {
            setSendingResetLink(true);
            setResetLinkStatus(null);

            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || "Could not send reset link.");
            }

            setResetLinkStatus(
                data?.message ||
                "If an account exists with this email, a reset link has been sent."
            );
        } catch (error) {
            if (error instanceof Error) {
                setResetLinkStatus(error.message);
            } else {
                setResetLinkStatus("Could not send reset link.");
            }
        } finally {
            setSendingResetLink(false);
        }
    };

    return (
        <div className="flex h-full min-w-0 flex-col gap-2 overflow-auto">
            <PageHeader
                title="Settings"
                subtitle="Configure AI Email Assistant"
            />

            <div className="border border-border rounded-xl p-4 flex flex-col gap-5">
                <div className="flex flex-col gap-2 text-sm">
                    <label className="font-medium">Email Settings</label>

                    <input
                        type="email"
                        value={emailAddress}
                        onChange={(event) => setEmailAddress(event.target.value)}
                        placeholder="example@gmail.com"
                        className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                    />

                    <input
                        type="password"
                        value={emailAppPassword}
                        onChange={(event) => setEmailAppPassword(event.target.value)}
                        placeholder={
                            hasSavedAppPassword
                                ? "****************"
                                : "Enter email password or app password"
                        }
                        className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                        autoComplete="new-password"
                    />
                    <p className="text-xs text-muted">
                        This password is encrypted at rest. Leave blank only if you already saved one.
                    </p>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                    <label className="font-medium">Automation Settings</label>
                    <label className="flex items-start gap-2 text-xs text-muted">
                        <input
                            type="checkbox"
                            checked={autoApproveUnread}
                            onChange={(event) =>
                                setAutoApproveUnread(event.target.checked)
                            }
                        />
                        Auto-read unread emails and move them to ready-to-send without manual approval
                    </label>

                    <label className="flex items-start gap-2 text-xs text-muted">
                        <input
                            type="checkbox"
                            checked={autoSendReadyEmails}
                            onChange={(event) =>
                                setAutoSendReadyEmails(event.target.checked)
                            }
                        />
                        Auto-send ready-to-send emails without human intervention
                    </label>

                    <p className="text-xs text-muted">
                        When both options are active, new unread emails can be processed and sent automatically.
                    </p>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                    <label className="font-medium">Security</label>
                    <p className="text-xs text-muted">
                        Need a password reset link for your account email?
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={sendResetPasswordLink}
                            disabled={sendingResetLink || loading}
                            className="rounded-md border border-primary px-3 py-2 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                        >
                            {sendingResetLink ? "Sending..." : "Send Password Reset Link"}
                        </button>
                        <a
                            href="/forgot-password"
                            className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary"
                        >
                            Open Forgot Password Page
                        </a>
                    </div>
                    {resetLinkStatus && (
                        <p className="text-xs text-muted">{resetLinkStatus}</p>
                    )}
                </div>

                <div className="flex flex-col gap-2 text-sm">
                    <label className="font-medium">AI Provider Settings</label>
                    <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                            type="checkbox"
                            checked={useDefaultAiProvider}
                            onChange={(event) =>
                                setUseDefaultAiProvider(event.target.checked)
                            }
                        />
                        Use default AI provider and API key
                    </label>

                    <select
                        value={aiProvider}
                        onChange={(event) =>
                            setAiProvider(normalizeProvider(event.target.value))
                        }
                        disabled={useDefaultAiProvider}
                        className="border border-border rounded-md px-3 py-2 outline-none text-sm disabled:opacity-60"
                    >
                        <option value="gemini">Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                    </select>

                    <input
                        type="password"
                        value={aiApiKey}
                        onChange={(event) => setAiApiKey(event.target.value)}
                        disabled={useDefaultAiProvider}
                        placeholder={
                            hasSavedAiApiKey
                                ? "****************"
                                : "Enter provider API key"
                        }
                        className="border border-border rounded-md px-3 py-2 outline-none text-sm disabled:opacity-60"
                        autoComplete="new-password"
                    />
                    <p className="text-xs text-muted">
                        Leave blank to keep current key.
                    </p>
                </div>

                <div className="flex flex-col gap-1 text-sm">
                    <label>Custom Email Categories</label>
                    <p className="text-xs text-muted">
                        Default categories stay active: {defaultCategories.join(", ")}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={newParam}
                            onChange={(event) => setNewParam(event.target.value)}
                            placeholder="Add custom category"
                            className="border border-border rounded-md px-3 py-2 flex-1 outline-none text-sm"
                        />
                        <button
                            type="button"
                            onClick={addParam}
                            className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary/80 sm:w-auto w-full flex items-center justify-center"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {params.map((param, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-xs bg-muted/10"
                            >
                                {param}
                                <X
                                    size={12}
                                    className="cursor-pointer"
                                    onClick={() => removeParam(index)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1 text-sm">
                    <label>Custom AI Prompt</label>
                    <textarea
                        value={promptDescription}
                        onChange={(event) => setPromptDescription(event.target.value)}
                        placeholder="Add extra instruction for AI analyzer (this is appended to default prompt)"
                        className="border border-border rounded-md px-3 py-2 outline-none text-sm resize-none h-24"
                    />
                </div>

                <div className="flex justify-end mt-2">
                    <button
                        type="button"
                        disabled={saving || loading}
                        onClick={saveSettings}
                        className="bg-success text-white px-4 py-2 rounded-md hover:bg-success/80 text-sm disabled:opacity-50 w-full sm:w-auto"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
                {status && <p className="text-xs text-muted">{status}</p>}
            </div>
        </div>
    );
}
