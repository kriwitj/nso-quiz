import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { User } from '@prisma/client';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuizDto, userId: string) {
    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        coverImage: dto.coverImage,
        isPublic: dto.isPublic ?? false,
        hostId: userId,
      },
      include: { questions: { include: { choices: true }, orderBy: { order: 'asc' } } },
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { hostId: userId },
        skip,
        take: limit,
        include: {
          _count: { select: { questions: true, sessions: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.quiz.count({ where: { hostId: userId } }),
    ]);
    return { items: quizzes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId?: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: { choices: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        host: { select: { id: true, name: true, avatar: true } },
        _count: { select: { sessions: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (!quiz.isPublic && userId && quiz.hostId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostId !== userId) throw new ForbiddenException('Access denied');
    return this.prisma.quiz.update({
      where: { id },
      data: dto,
      include: { questions: { include: { choices: true }, orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.quiz.delete({ where: { id } });
    return { success: true };
  }

  async duplicate(id: string, userId: string) {
    const quiz = await this.findOne(id, userId);
    const newQuiz = await this.prisma.quiz.create({
      data: {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        coverImage: quiz.coverImage,
        isPublic: false,
        hostId: userId,
        questions: {
          create: quiz.questions.map((q) => ({
            type: q.type,
            text: q.text,
            imageUrl: q.imageUrl,
            timeLimit: q.timeLimit,
            points: q.points,
            order: q.order,
            choices: {
              create: q.choices.map((c) => ({
                text: c.text,
                imageUrl: c.imageUrl,
                isCorrect: c.isCorrect,
                order: c.order,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { choices: true } } },
    });
    return newQuiz;
  }

  async addQuestion(quizId: string, dto: CreateQuestionDto, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostId !== userId) throw new ForbiddenException('Access denied');

    const lastQuestion = await this.prisma.question.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
    });
    const order = (lastQuestion?.order ?? 0) + 1;

    return this.prisma.question.create({
      data: {
        quizId,
        type: dto.type,
        text: dto.text,
        imageUrl: dto.imageUrl,
        timeLimit: dto.timeLimit ?? 30,
        points: dto.points ?? 1000,
        order,
        choices: {
          create: dto.choices.map((c, i) => ({
            text: c.text,
            imageUrl: c.imageUrl,
            isCorrect: c.isCorrect,
            order: i + 1,
          })),
        },
      },
      include: { choices: { orderBy: { order: 'asc' } } },
    });
  }

  async updateQuestion(questionId: string, dto: any, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.quiz.hostId !== userId) throw new ForbiddenException('Access denied');

    if (dto.choices) {
      await this.prisma.choice.deleteMany({ where: { questionId } });
      await this.prisma.choice.createMany({
        data: dto.choices.map((c: any, i: number) => ({
          questionId,
          text: c.text,
          imageUrl: c.imageUrl,
          isCorrect: c.isCorrect,
          order: i + 1,
        })),
      });
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        type: dto.type,
        text: dto.text,
        imageUrl: dto.imageUrl,
        timeLimit: dto.timeLimit,
        points: dto.points,
        order: dto.order,
      },
      include: { choices: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteQuestion(questionId: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.quiz.hostId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.question.delete({ where: { id: questionId } });
    return { success: true };
  }

  async reorderQuestions(quizId: string, questionIds: string[], userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostId !== userId) throw new ForbiddenException('Access denied');

    await Promise.all(
      questionIds.map((id, index) =>
        this.prisma.question.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
    return { success: true };
  }
}
