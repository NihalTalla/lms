import dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

dotenv.config();

const prisma = new PrismaClient();

function ask(question: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  try {
    // Basic env check
    if (!process.env.DATABASE_URL) {
      console.error('ERROR: DATABASE_URL not set. Set it via .env or environment variables.');
      process.exit(1);
    }

    // Check if an admin already exists
    const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (existing) {
      console.log(`Admin user already exists: ${existing.email} (id=${existing.id}). Aborting bootstrap.`);
      await prisma.$disconnect();
      process.exit(0);
    }

    const email = process.env.ADMIN_EMAIL ?? (await ask('Admin email: '));
    if (!email) {
      console.error('No email provided');
      process.exit(1);
    }

    const name = process.env.ADMIN_NAME ?? (await ask('Admin name (display): '));
    const password = process.env.ADMIN_PASSWORD ?? (await ask('Admin password: '));
    if (!password) {
      console.error('No password provided');
      process.exit(1);
    }

    // check duplicate email
    const dup = await prisma.user.findUnique({ where: { email } });
    if (dup) {
      console.error(`User with email ${email} already exists (id=${dup.id}). Aborting.`);
      await prisma.$disconnect();
      process.exit(1);
    }

    const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email,
        passwordHash,
        role: 'admin' as Role
      }
    });

    console.log(`✅ Created admin user: ${user.email} (id=${user.id})`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Bootstrap failed:', err);
    await prisma.$disconnect();
    process.exit(2);
  }
}

void main();
