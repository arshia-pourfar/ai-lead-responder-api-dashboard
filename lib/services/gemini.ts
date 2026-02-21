import { getUserAiSettings } from "@/lib/services/userSettings";
import { generateAiText } from "@/lib/services/aiClient";

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

    const aiReply = await generateAiText(prompt, {
        userId,
        temperature: 0.4,
        maxTokens: 350,
    });

    if (!aiReply) {
        return { reply: "Thanks for reaching out! We'll reply shortly." };
    }

    return { reply: aiReply };
}
