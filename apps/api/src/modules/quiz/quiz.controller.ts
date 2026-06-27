import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz' })
  create(@Body() dto: CreateQuizDto, @CurrentUser() user: User) {
    return this.quizService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List my quizzes (paginated)' })
  findAll(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.quizService.findAll(user.id, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizService.findOne(id, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto, @CurrentUser() user: User) {
    return this.quizService.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizService.remove(id, user.id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizService.duplicate(id, user.id);
  }

  @Post(':id/questions')
  addQuestion(
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.quizService.addQuestion(id, dto, user.id);
  }

  @Put(':id/questions/reorder')
  reorderQuestions(
    @Param('id') id: string,
    @Body() body: { questionIds: string[] },
    @CurrentUser() user: User,
  ) {
    return this.quizService.reorderQuestions(id, body.questionIds, user.id);
  }

  @Put('questions/:questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.quizService.updateQuestion(questionId, dto, user.id);
  }

  @Delete('questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string, @CurrentUser() user: User) {
    return this.quizService.deleteQuestion(questionId, user.id);
  }
}
