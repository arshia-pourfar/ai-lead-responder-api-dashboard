// lib/services/emailService.ts
import prisma from "../prisma";

// نوع داده برای ایجاد ایمیل
export type EmailCreateInput = {
  subject: string;
  body: string;
  userId: string;
  accountId?: string;
  status?: string;
  aiReply?: string;
  readyToSend?: boolean;
  readyToSell?: boolean;
};

export const emailService = {
  async getAll(userId: string) {
    return prisma.email.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: EmailCreateInput) {
    return prisma.email.create({ data });
  },

  async readyToSend(userId: string) {
    return prisma.email.findMany({
      where: {
        userId,
        readyToSend: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async readyToSell(userId: string) {
    return prisma.email.findMany({
      where: {
        userId,
        readyToSell: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

// تابع analyzeEmail برای تحلیل ایمیل
export const analyzeEmail = async (emailId: string) => {
  const email = await prisma.email.update({
    where: { id: emailId },
    data: { status: "analyzed" },
  });
  return email;
};
