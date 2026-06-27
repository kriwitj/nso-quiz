import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@CurrentUser() user: User) {
    return this.analyticsService.getOverview(user.id);
  }

  @Get('quizzes/:id')
  getQuizAnalytics(@Param('id') id: string) {
    return this.analyticsService.getQuizAnalytics(id);
  }

  @Get('sessions/:id')
  getSessionAnalytics(@Param('id') id: string) {
    return this.analyticsService.getSessionAnalytics(id);
  }
}
