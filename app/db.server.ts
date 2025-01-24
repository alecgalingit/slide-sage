import { PrismaClient } from "@prisma/client";

import { singleton } from "./singleton.server";

// Avoid reinstatiating database connection
const prisma = singleton("prisma", () => new PrismaClient());

prisma.$connect();

export { prisma };