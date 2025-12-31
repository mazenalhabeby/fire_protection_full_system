import { Module } from '@nestjs/common';
import { DatabaseCleanupService } from './database-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [DatabaseCleanupService, PrismaService],
  exports: [DatabaseCleanupService],
})
export class DatabaseMaintenanceModule {}
