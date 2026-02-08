import prisma from "../prisma";

export async function authUser(apiKey: string | null) {
  if (!apiKey) return null;

  return prisma.user.findUnique({
    where: { apiKey },
  });
}
