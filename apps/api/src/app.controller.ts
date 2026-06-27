import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
