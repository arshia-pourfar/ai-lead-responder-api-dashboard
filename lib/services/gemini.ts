// lib/services/gemini.ts
import fetch from "node-fetch";
import { getUserAiSettings } from "@/lib/services/userSettings";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function analyzeLead(category: string, message: string, userId?: string) {
    let customPrompt = "";

    if (userId) {
        try {
            const settings = await getUserAiSettings(userId);
            customPrompt = settings.customPrompt;
        } catch (error) {
            console.error("Failed to load user AI settings for reply:", error);
        }
    }

    const basePrompt = `
You are an AI sales/support assistant.
Category: ${category}
Customer message: ${message}

Write a short, friendly, professional reply that encourages the customer to continue the conversation.
`;

    const prompt = customPrompt
        ? `${basePrompt}\nAdditional user instruction (append to system behavior):\n${customPrompt}`
        : basePrompt;

    try {
        if (!process.env.GEMINI_API_KEY) {
            return { reply: "Thanks for reaching out! We'll reply shortly." };
        }

        const res = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": process.env.GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Gemini API error:", errorText);
            return { reply: "Failed to generate AI reply." };
        }

        const data = await res.json();
        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, no response";

        return { reply: text };
    } catch (err) {
        console.error("Gemini error details:", err);
        return { reply: "Sorry, an error occurred while generating a reply." };
    }
}
