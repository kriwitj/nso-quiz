import { PrismaClient, UserRole, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quiz.local' },
    update: {},
    create: {
      email: 'admin@quiz.local',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Create host user
  const hostPassword = await bcrypt.hash('host1234', 12);
  const host = await prisma.user.upsert({
    where: { email: 'host@quiz.local' },
    update: {},
    create: {
      email: 'host@quiz.local',
      name: 'Demo Host',
      password: hostPassword,
      role: UserRole.HOST,
    },
  });

  // Create sample quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'General Knowledge Quiz',
      description: 'A fun general knowledge quiz to test your brain!',
      isPublic: true,
      hostId: host.id,
      questions: {
        create: [
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'What is the capital of France?',
            timeLimit: 20,
            points: 1000,
            order: 1,
            choices: {
              create: [
                { text: 'Paris', isCorrect: true, order: 1 },
                { text: 'London', isCorrect: false, order: 2 },
                { text: 'Berlin', isCorrect: false, order: 3 },
                { text: 'Madrid', isCorrect: false, order: 4 },
              ],
            },
          },
          {
            type: QuestionType.TRUE_FALSE,
            text: 'The Great Wall of China is visible from space with the naked eye.',
            timeLimit: 15,
            points: 1000,
            order: 2,
            choices: {
              create: [
                { text: 'True', isCorrect: false, order: 1 },
                { text: 'False', isCorrect: true, order: 2 },
              ],
            },
          },
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Which planet is known as the Red Planet?',
            timeLimit: 20,
            points: 1000,
            order: 3,
            choices: {
              create: [
                { text: 'Venus', isCorrect: false, order: 1 },
                { text: 'Mars', isCorrect: true, order: 2 },
                { text: 'Jupiter', isCorrect: false, order: 3 },
                { text: 'Saturn', isCorrect: false, order: 4 },
              ],
            },
          },
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Who painted the Mona Lisa?',
            timeLimit: 30,
            points: 1000,
            order: 4,
            choices: {
              create: [
                { text: 'Michelangelo', isCorrect: false, order: 1 },
                { text: 'Rafael', isCorrect: false, order: 2 },
                { text: 'Leonardo da Vinci', isCorrect: true, order: 3 },
                { text: 'Donatello', isCorrect: false, order: 4 },
              ],
            },
          },
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'What is the largest ocean on Earth?',
            timeLimit: 20,
            points: 1000,
            order: 5,
            choices: {
              create: [
                { text: 'Atlantic Ocean', isCorrect: false, order: 1 },
                { text: 'Indian Ocean', isCorrect: false, order: 2 },
                { text: 'Arctic Ocean', isCorrect: false, order: 3 },
                { text: 'Pacific Ocean', isCorrect: true, order: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Seeded:');
  console.log(`  Admin: ${admin.email} / admin1234`);
  console.log(`  Host: ${host.email} / host1234`);
  console.log(`  Quiz: "${quiz.title}" (${quiz.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
