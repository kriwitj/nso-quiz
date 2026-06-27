import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Body() body: { quizId: string }, @CurrentUser() user: User) {
    return this.sessionsService.create(body.quizId, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.sessionsService.findAll(user.id, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.findOne(id, user.id);
  }

  @Post(':id/end')
  end(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.end(id, user.id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.getResults(id, user.id);
  }
}
