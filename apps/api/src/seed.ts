import bcrypt from "bcryptjs";
import { prisma } from "./db.js";

/**
 * Seed a demo workspace so the app is usable the moment it boots.
 * Idempotent: re-running updates the demo user's password rather than erroring.
 *
 *   demo@lighthouse.app / demo12345
 */
async function main() {
  const email = "demo@lighthouse.app";
  const passwordHash = await bcrypt.hash("demo12345", 10);

  const existing = await prisma.user.findUnique({ where: { email }, include: { org: true } });

  const org = existing
    ? existing.org
    : await prisma.org.create({
        data: {
          name: "Demo Workspace",
          users: { create: { name: "Demo Founder", email, passwordHash, role: "OWNER" } },
        },
      });

  if (existing) {
    await prisma.user.update({ where: { email }, data: { passwordHash } });
  }

  const kit = await prisma.pressKit.upsert({
    where: { id: "seed-presskit" },
    update: {},
    create: {
      id: "seed-presskit",
      orgId: org.id,
      productName: "Demo Product",
      url: "https://demo.example.com",
      category: "ai-tools",
      founderName: "Demo Founder",
      email,
      taglineShort: "AI that ships your launch.",
      taglineMedium: "Demo Product helps founders get listed everywhere that matters.",
      taglineLong: "Demo Product is the in-house alternative to outsourced directory submission — own your data, automation, and analytics.",
      descShort: "Demo Product gets your startup listed across the directories that drive discovery.",
      descMedium: "Demo Product is a distribution platform that submits your startup to high-authority directories and tracks the resulting backlinks and traffic.",
      descLong: "Demo Product is a distribution platform that submits your startup to high-authority directories, routes captcha-gated sites to a paste-ready cockpit, and tracks the backlinks, referring domains, and traffic that result. Own your data, your automation, and your analytics.",
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded org ${org.id}, user ${email} / demo12345, press kit ${kit.id}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
