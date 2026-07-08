"use client";

import { useEffect, useState } from "react";
import { Plus, X, Mail, Shield, Sparkles, Tag, FileText, Save, Check, AlertCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import SuperLoading from "@/components/ui/SuperLoading";

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
    const [confirmLogout, setConfirmLogout] = useState(false);
    const router = useRouter();

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
            setStatus("Settings saved successfully.");
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

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
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

    if (loading) return <SuperLoading variant="list" label="Loading settings" />;

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text">Settings</h1>
                    <p className="mt-1 text-sm text-muted">Configure your AI Email Assistant</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={saving || loading}
                        onClick={saveSettings}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                    {confirmLogout ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-danger font-medium">Are you sure?</span>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:bg-danger/80"
                            >
                                Yes, Logout
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmLogout(false)}
                                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-text"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmLogout(true)}
                            className="mr-1 flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:bg-danger/80"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {status && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                    status.includes("success") || status === "Settings saved successfully."
                        ? "border-success/20 bg-success/5 text-success"
                        : "border-danger/20 bg-danger/5 text-danger"
                }`}>
                    <div className="flex items-center gap-2">
                        {status.includes("success") || status === "Settings saved successfully." ? (
                            <Check size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        {status}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Email Settings */}
                <SettingsCard icon={Mail} title="Email Settings" accent="primary">
                    <div className="flex flex-col gap-3">
                        <InputField
                            label="Email Address"
                            type="email"
                            value={emailAddress}
                            onChange={setEmailAddress}
                            placeholder="example@gmail.com"
                        />
                        <InputField
                            label="App Password"
                            type="password"
                            value={emailAppPassword}
                            onChange={setEmailAppPassword}
                            placeholder={hasSavedAppPassword ? "••••••••" : "Enter email app password"}
                            hint="This password is encrypted at rest. Leave blank to keep current."
                        />
                    </div>
                </SettingsCard>

                {/* Security */}
                <SettingsCard icon={Shield} title="Security" accent="tag-important">
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-muted">
                            Need a password reset link for your account email?
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={sendResetPasswordLink}
                                disabled={sendingResetLink || loading}
                                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
                            >
                                {sendingResetLink ? "Sending..." : "Send Reset Link"}
                            </button>
                            <a
                                href="/forgot-password"
                                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-text"
                            >
                                Open Forgot Password
                            </a>
                        </div>
                        {resetLinkStatus && (
                            <p className="text-xs text-muted">{resetLinkStatus}</p>
                        )}
                    </div>
                </SettingsCard>

                {/* AI Provider */}
                <SettingsCard icon={Sparkles} title="AI Provider" accent="tag-unread">
                    <div className="flex flex-col gap-3">
                        <CheckboxField
                            label="Use default AI provider and API key"
                            checked={useDefaultAiProvider}
                            onChange={setUseDefaultAiProvider}
                        />
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-medium text-muted">Provider</label>
                            <select
                                value={aiProvider}
                                onChange={(event) =>
                                    setAiProvider(normalizeProvider(event.target.value))
                                }
                                disabled={useDefaultAiProvider}
                                className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                            >
                                <option value="gemini">Gemini</option>
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                            </select>
                        </div>
                        <InputField
                            label="API Key"
                            type="password"
                            value={aiApiKey}
                            onChange={setAiApiKey}
                            placeholder={hasSavedAiApiKey ? "••••••••" : "Enter provider API key"}
                            hint="Leave blank to keep current key."
                            disabled={useDefaultAiProvider}
                        />
                    </div>
                </SettingsCard>

                {/* Automation */}
                <SettingsCard icon={Tag} title="Automation" accent="tag-sent">
                    <div className="flex flex-col gap-3">
                        <CheckboxField
                            label="Auto-approve unread emails and move to ready-to-send"
                            checked={autoApproveUnread}
                            onChange={setAutoApproveUnread}
                        />
                        <CheckboxField
                            label="Auto-send ready-to-send emails without intervention"
                            checked={autoSendReadyEmails}
                            onChange={setAutoSendReadyEmails}
                        />
                        <p className="text-[10px] text-muted">
                            When both options are active, new emails can be processed and sent automatically.
                        </p>
                    </div>
                </SettingsCard>

                {/* Custom Categories */}
                <SettingsCard icon={Tag} title="Custom Categories" accent="tag-important">
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] text-muted">
                            Default: {defaultCategories.join(", ")}
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newParam}
                                onChange={(event) => setNewParam(event.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addParam()}
                                placeholder="Add custom category"
                                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-muted/50 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                            <button
                                type="button"
                                onClick={addParam}
                                className="flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-white transition hover:bg-primary-hover"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        {params.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {params.map((param, index) => (
                                    <span
                                        key={index}
                                        className="flex items-center gap-1 rounded-lg border border-border bg-bg/50 px-2 py-1 text-xs text-text"
                                    >
                                        {param}
                                        <X
                                            size={12}
                                            className="cursor-pointer text-muted transition hover:text-danger"
                                            onClick={() => removeParam(index)}
                                        />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </SettingsCard>

                {/* Custom Prompt */}
                <SettingsCard icon={FileText} title="Custom AI Prompt" accent="primary">
                    <div className="flex flex-col gap-3">
                        <p className="text-[10px] text-muted">
                            Extra instructions appended to the default AI prompt.
                        </p>
                        <textarea
                            value={promptDescription}
                            onChange={(event) => setPromptDescription(event.target.value)}
                            placeholder="Add extra instruction for AI analyzer..."
                            className="min-h-[120px] w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 font-sans text-xs text-text placeholder:text-muted/50 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        />
                    </div>
                </SettingsCard>
            </div>
        </div>
    );
}

function SettingsCard({
    icon: Icon,
    title,
    accent,
    children,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    accent: string;
    children: React.ReactNode;
}) {
    const colorMap: Record<string, string> = {
        primary: "bg-primary/10 text-primary",
        "tag-unread": "bg-tag-unread/10 text-tag-unread",
        "tag-sent": "bg-tag-sent/10 text-tag-sent",
        "tag-important": "bg-tag-important/10 text-tag-important",
    };

    return (
        <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[accent] || "bg-primary/10 text-primary"}`}>
                    <Icon size={14} />
                </div>
                <h3 className="text-sm font-semibold text-text">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function InputField({
    label,
    type,
    value,
    onChange,
    placeholder,
    hint,
    disabled,
}: {
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    hint?: string;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-muted/50 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                autoComplete="new-password"
            />
            {hint && <p className="text-[10px] text-muted">{hint}</p>}
        </div>
    );
}

function CheckboxField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer">
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                    className="peer sr-only"
                />
                <div className="h-4 w-4 rounded border border-border bg-bg transition peer-checked:border-primary peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/20" />
                <Check size={10} className="absolute left-1 top-1 text-white opacity-0 transition peer-checked:opacity-100" />
            </div>
            <span className="text-xs text-text">{label}</span>
        </label>
    );
}
