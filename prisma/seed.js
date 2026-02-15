/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // === Create a test user ===
    const hashedPassword = await hash("testpassword", 10);
    const accessCode = crypto.randomBytes(8).toString("hex"); // 16 chars

    const user = await prisma.user.upsert({
        where: { email: "testuser@example.com" },
        update: {},
        create: {
            name: "Test User",
            email: "testuser@example.com",
            password: hashedPassword,
            plan: "free",
            apiKey: "TEST-API-KEY-123",
            accessCode,
            deviceLimit: 1,
        },
    });

    // === Create Email Account ===
    let account = await prisma.emailAccount.findFirst({
        where: { email: "user1@gmail.com", userId: user.id },
    });

    if (!account) {
        account = await prisma.emailAccount.create({
            data: {
                email: "user1@gmail.com",
                provider: "Gmail",
                userId: user.id,
            },
        });
    }

    // === Create Emails ===
    await prisma.email.createMany({
        data: [
            {
                subject: "Welcome to AI Email SaaS",
                body: "این یک ایمیل تستی برای شروع پروژه است",
                status: "draft",
                tag: "unread",
                readyToSend: false,
                readyToSell: false,
                userId: user.id,
                accountId: account.id,
            },
            {
                subject: "Second Test Email",
                body: "محتوای تستی دوم برای بررسی سیستم",
                status: "ready_send",
                tag: "read",
                readyToSend: true,
                readyToSell: false,
                userId: user.id,
                accountId: account.id,
            },
            {
                subject: "AI Response Example",
                body: "ایمیل با پاسخ AI تستی",
                aiReply: "این پاسخ AI تستی است",
                status: "analyzed",
                tag: "important",
                readyToSend: false,
                readyToSell: true,
                userId: user.id,
                accountId: account.id,
            },
        ],
    });

    // === Create Prompts ===
    await prisma.prompt.createMany({
        data: [
            { title: "Greeting Prompt", content: "Write a friendly greeting email", userId: user.id },
            { title: "Follow-up Prompt", content: "Write a polite follow-up email", userId: user.id },
        ],
    });

    // === Create Categories ===
    await prisma.category.createMany({
        data: [
            { name: "Work", userId: user.id },
            { name: "Personal", userId: user.id },
            { name: "Important", userId: user.id },
            { name: "Newsletter", userId: user.id },
        ],
    });

    console.log("✅ Seed data inserted successfully");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
