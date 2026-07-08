"use client";

import { useState } from "react";
import {
    LayoutDashboard,
    Mail,
    Send,
    CheckCheck,
    ShoppingBag,
    BarChart3,
    Settings,
    ChevronDown,
    Sparkles,
    Zap,
    Shield,
    Lightbulb,
    ArrowRight,
    BookOpen,
} from "lucide-react";

type SectionId = string;

const SECTIONS = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: Zap,
        accent: "primary",
        content: [
            {
                title: "Welcome to AI Mail",
                text: "AI Mail is an intelligent email assistant that uses AI to read, categorize, and respond to your emails automatically. It helps you save time by handling routine email responses.",
            },
            {
                title: "How It Works",
                steps: [
                    "Connect your email account in Settings",
                    "AI automatically reads and categorizes incoming emails",
                    "Unread emails appear on your Dashboard",
                    "Review AI suggestions and approve or edit them",
                    "Send responses with one click",
                ],
            },
            {
                title: "Quick Setup",
                steps: [
                    "Go to Settings and enter your email address",
                    "Add your Gmail App Password (or email password)",
                    "Configure your AI provider (Gemini is default)",
                    "Save settings and you're ready to go!",
                ],
            },
        ],
    },
    {
        id: "dashboard",
        title: "Dashboard",
        icon: LayoutDashboard,
        accent: "primary",
        content: [
            {
                title: "Overview",
                text: "The Dashboard is your home screen. It shows all your emails organized in two tabs: Inbox (unread + ready) and Outbox (sent + important).",
            },
            {
                title: "Stat Cards",
                text: "At the top, you'll see 4 stat cards showing counts for Unread, Ready to Send, Sent, and Important emails.",
            },
            {
                title: "Inbox Tab",
                text: "Shows Unread Emails on the left and Ready to Send on the right. This is where you spend most of your time reviewing and approving AI replies.",
            },
            {
                title: "Outbox Tab",
                text: "Shows Sent Emails and Important/Sell emails. Use this to review your sent history and track sales leads.",
            },
        ],
    },
    {
        id: "unread-emails",
        title: "Unread Emails",
        icon: Mail,
        accent: "tag-unread",
        content: [
            {
                title: "What Are Unread Emails",
                text: "These are new emails that AI has detected but hasn't processed yet. Each email shows the subject, sender, and a tag.",
            },
            {
                title: "Actions You Can Take",
                steps: [
                    "AI Reply - Let AI generate a response automatically",
                    "Manual - Write your own reply",
                    "Ignore - Dismiss the email without responding",
                    "View - Click the eye icon to see full email details",
                ],
            },
            {
                title: "The Workflow",
                text: "1. Review the email subject and sender\n2. Choose AI Reply, Manual, or Ignore\n3. If AI Reply, wait for the generated response\n4. Click the checkmark to approve and move to Ready to Send",
            },
            {
                title: "Tips",
                tips: [
                    "Use search to find specific emails quickly",
                    "Filter by date, confidence, or category",
                    "The AI confidence score shows how sure the AI is about the email category",
                ],
            },
        ],
    },
    {
        id: "ready-to-send",
        title: "Ready to Send",
        icon: Send,
        accent: "primary",
        content: [
            {
                title: "What Are Ready Emails",
                text: "These are emails that have been approved (either by you or auto-approved) and are waiting to be sent. The AI reply is already generated.",
            },
            {
                title: "Actions You Can Take",
                steps: [
                    "Edit - Modify the AI reply before sending",
                    "Send - Send the email immediately",
                    "View - See full email and reply details",
                ],
            },
            {
                title: "Editing a Reply",
                text: "Click the pencil icon to edit the AI-generated reply. Make your changes and click Save to keep them, or Send to send immediately.",
            },
            {
                title: "Bulk Actions",
                text: "You can process multiple emails quickly by reviewing each one and clicking Send. The email will be moved to Sent automatically.",
            },
        ],
    },
    {
        id: "sent-emails",
        title: "Sent Emails",
        icon: CheckCheck,
        accent: "tag-sent",
        content: [
            {
                title: "What Are Sent Emails",
                text: "These are emails that have been successfully sent. You can review your sent history here.",
            },
            {
                title: "Viewing Sent Emails",
                text: "Click the eye icon on any sent email to see the full content, including the original message and your reply.",
            },
            {
                title: "Resending Emails",
                text: "If you need to send a similar response again, open the email and use the Send button to compose a new reply based on the original.",
            },
        ],
    },
    {
        id: "ready-to-sell",
        title: "Ready to Sell",
        icon: ShoppingBag,
        accent: "tag-important",
        content: [
            {
                title: "What Are Sales Leads",
                text: "AI automatically detects emails that might be sales opportunities. These appear in the Ready to Sell section with a sell score.",
            },
            {
                title: "Understanding Sell Score",
                text: "The sell score indicates how likely the email is a sales opportunity. Higher scores mean stronger potential.",
            },
            {
                title: "Taking Action",
                steps: [
                    "Review the lead to understand the opportunity",
                    "Use the reply feature to respond to the lead",
                    "Track your progress in the Analytics page",
                ],
            },
        ],
    },
    {
        id: "analytics",
        title: "Analytics",
        icon: BarChart3,
        accent: "tag-sent",
        content: [
            {
                title: "Overview",
                text: "Analytics gives you insights into your email performance, sales leads, and AI accuracy.",
            },
            {
                title: "Charts",
                steps: [
                    "Leads by Category - Pie chart showing email distribution",
                    "Sales Over Time - Bar chart of monthly sales activity",
                ],
            },
            {
                title: "Key Metrics",
                steps: [
                    "Total Sales - Sum of all sales activity",
                    "Confirmed Emails - Number of emails processed",
                    "Avg / Month - Average monthly performance",
                ],
            },
        ],
    },
    {
        id: "settings",
        title: "Settings",
        icon: Settings,
        accent: "primary",
        content: [
            {
                title: "Email Settings",
                text: "Enter your email address and app password. For Gmail, use a 16-digit App Password (not your regular password).",
            },
            {
                title: "AI Provider",
                text: "Choose between Gemini (default), OpenAI, or Anthropic. You can use the default provider or enter your own API key.",
            },
            {
                title: "Automation",
                steps: [
                    "Auto-approve unread - Automatically moves emails to Ready to Send",
                    "Auto-send - Automatically sends ready emails without manual review",
                ],
            },
            {
                title: "Custom Categories",
                text: "Add your own email categories beyond the defaults (unread, ready, important, sent). These appear in filters across the app.",
            },
            {
                title: "Custom AI Prompt",
                text: "Add extra instructions for the AI analyzer. This is appended to the default prompt and can help tailor responses to your needs.",
            },
        ],
    },
    {
        id: "tips",
        title: "Tips & Tricks",
        icon: Lightbulb,
        accent: "tag-important",
        content: [
            {
                title: "Keyboard Shortcuts",
                tips: [
                    "Press Enter in search to filter immediately",
                    "Use Tab to navigate between form fields",
                    "Click outside modals to close them",
                ],
            },
            {
                title: "Email View Preference",
                text: "When viewing an email, you can toggle between HTML and Plain text views. Your preference is saved automatically.",
            },
            {
                title: "Filtering Emails",
                tips: [
                    "Use the Filters button to show/hide filter options",
                    "Combine multiple filters for precise results",
                    "Click 'Clear all filters' to reset everything",
                ],
            },
            {
                title: "Mobile Usage",
                text: "The app works great on mobile. Use the hamburger menu to access navigation. All features are available on mobile.",
            },
        ],
    },
    {
        id: "faq",
        title: "FAQ",
        icon: BookOpen,
        accent: "tag-unread",
        content: [
            {
                title: "Why isn't AI generating replies?",
                text: "Check that your AI provider is configured correctly in Settings. If using the default provider, ensure you have internet access.",
            },
            {
                title: "Why aren't new emails appearing?",
                text: "The app checks for new emails periodically. If emails aren't appearing, try refreshing the page or check your email settings.",
            },
            {
                title: "How do I reset my password?",
                text: "Go to Settings > Security and click 'Send Reset Link'. Or visit the Forgot Password page from the login screen.",
            },
            {
                title: "Is my data secure?",
                text: "Yes. Email passwords are encrypted at rest. The AI only processes email content and doesn't store personal data beyond what's needed.",
            },
            {
                title: "Can I use multiple email accounts?",
                text: "Currently, the app supports one email account per user. Multi-account support is planned for a future update.",
            },
        ],
    },
];

export default function DocsPage() {
    const [expandedSection, setExpandedSection] = useState<SectionId | null>("getting-started");

    const toggleSection = (id: SectionId) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    return (
        <div className="flex h-full min-w-0 flex-col gap-4 overflow-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text">Documentation</h1>
                    <p className="mt-1 text-sm text-muted">Learn how to use AI Mail effectively</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                    <BookOpen size={16} className="text-primary" />
                    <span className="text-xs font-medium text-muted">Help Guide</span>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SECTIONS.slice(0, 4).map((section) => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => {
                                setExpandedSection(section.id);
                                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30"
                        >
                            <Icon size={16} className="text-primary" />
                            <span className="text-xs font-medium text-text">{section.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-3">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSection === section.id;

                    return (
                        <div
                            key={section.id}
                            id={section.id}
                            className="rounded-xl border border-border bg-card transition hover:shadow-sm"
                        >
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${section.accent}/10 text-${section.accent}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-semibold text-text">{section.title}</span>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-muted transition ${isExpanded ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isExpanded && (
                                <div className="border-t border-border px-4 py-4">
                                    <div className="flex flex-col gap-4">
                                        {section.content.map((item, index) => (
                                            <div key={index} className="flex flex-col gap-2">
                                                <h4 className="text-sm font-medium text-text">{item.title}</h4>

                                                {item.text && (
                                                    <p className="text-xs leading-relaxed text-muted whitespace-pre-line">
                                                        {item.text}
                                                    </p>
                                                )}

                                                {item.steps && (
                                                    <ul className="flex flex-col gap-1.5">
                                                        {item.steps.map((step, stepIndex) => (
                                                            <li key={stepIndex} className="flex items-start gap-2 text-xs text-muted">
                                                                <ArrowRight size={12} className="mt-0.5 shrink-0 text-primary" />
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {item.tips && (
                                                    <ul className="flex flex-col gap-1.5">
                                                        {item.tips.map((tip, tipIndex) => (
                                                            <li key={tipIndex} className="flex items-start gap-2 text-xs text-muted">
                                                                <Lightbulb size={12} className="mt-0.5 shrink-0 text-warning" />
                                                                {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-semibold text-text">Need more help?</h4>
                <p className="mt-1 text-xs text-muted">
                    Contact support or check the settings page for configuration options.
                </p>
            </div>
        </div>
    );
}