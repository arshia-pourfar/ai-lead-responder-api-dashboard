import prisma from "../prisma";

export const userService = {
    async login(email: string, accessCode: string) {
        return prisma.user.findFirst({
            where: { email, accessCode },
        });
    },
};
