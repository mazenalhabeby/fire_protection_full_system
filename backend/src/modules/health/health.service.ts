import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface ReadinessResponse extends HealthResponse {
  checks: {
    database: {
      status: 'ok' | 'error';
      responseTime?: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor(private readonly prisma: PrismaService) {
    this.startTime = Date.now();
  }

  /**
   * Basic health check - returns service status
   */
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Liveness check - confirms the service is alive
   * Used by Kubernetes/Docker for liveness probes
   */
  checkLiveness(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Readiness check - verifies all dependencies are available
   * Used by load balancers to determine if traffic should be sent
   */
  async checkReadiness(): Promise<ReadinessResponse> {
    const checks: ReadinessResponse['checks'] = {
      database: { status: 'ok' },
    };

    // Check database connectivity
    const dbStartTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'ok',
        responseTime: Date.now() - dbStartTime,
      };
    } catch (error) {
      checks.database = {
        status: 'error',
        responseTime: Date.now() - dbStartTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }

    // Determine overall status
    const allChecksOk = Object.values(checks).every(c => c.status === 'ok');

    if (!allChecksOk) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        environment: process.env.NODE_ENV || 'development',
        checks,
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }
}
