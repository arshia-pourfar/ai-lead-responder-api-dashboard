import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface GeminiResponse {
    candidates?: Array<{
        content: Array<{ parts: Array<{ text: string }> }>;
    }>;
}

export interface AIResult {
    reply: string;
}

export async function analyzeLead(category: string, message: string): Promise<AIResult> {
    const prompt = `
    You are an AI sales/support assistant.
    Category: ${category}
    Customer message: ${message}

    Write a short, friendly, professional reply that encourages the customer to continue the conversation.
  `;

    try {
        if (!process.env.GEMINI_API_KEY) {
            return { reply: "Thanks for reaching out! We'll reply shortly." };
        }

        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", errorText);
            throw new Error("Gemini API failed");
        }

        const data: unknown = await response.json();
        const text = (data as GeminiResponse)?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text || "Sorry, no response";

        return { reply: text };

    } catch (err) {
        console.error("Gemini error details:", err);
        return { reply: "Sorry, an error occurred while generating a reply." };
    }
}
