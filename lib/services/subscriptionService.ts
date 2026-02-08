import prisma from "../prisma";

export const subscriptionService = {
    async checkLimit(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return user?.deviceLimit ?? 1;
    },
};
