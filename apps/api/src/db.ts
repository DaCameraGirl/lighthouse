import { PrismaClient } from "@prisma/client";

/** Singleton Prisma client — one pool per process. */
export const prisma = new PrismaClient();
