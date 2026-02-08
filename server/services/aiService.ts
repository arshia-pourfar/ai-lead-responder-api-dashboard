import prisma from "../../lib/prisma";

export const aiService = {
  async markReadyToSend(emailId: string) {
    return prisma.email.update({
      where: { id: emailId },
      data: { readyToSend: true },
    });
  },

  async markReadyToSell(emailId: string) {
    return prisma.email.update({
      where: { id: emailId },
      data: { readyToSell: true },
    });
  },
};
