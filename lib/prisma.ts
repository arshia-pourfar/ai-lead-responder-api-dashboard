import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: (process.env.PRISMA_ERROR_LOGS || "").toLowerCase() === "true" ? ["error"] : [],
        errorFormat: "pretty",
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
                pool: {
                    timeout: 10000,
                },
            },
        },
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
