import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { SmartThrottleGuard } from './guards/smart-throttle.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [RateLimiterService, SmartThrottleGuard],
  exports: [RateLimiterService, SmartThrottleGuard],
})
export class CommonModule {}
