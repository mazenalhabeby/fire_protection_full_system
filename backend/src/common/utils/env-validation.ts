/**
 * Environment Variable Validation Utility
 * Validates required environment variables at application startup
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvConfig {
  required: string[];
  optional: string[];
}

const productionConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'FRONTEND_URL',
    'ADMIN_URL',
    'BACKEND_URL',
  ],
  optional: [
    'PORT',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_EMAIL',
    'SMTP_FROM_NAME',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'TWO_FACTOR_ENCRYPTION_KEY',
    'BSC_RPC_URL',
    'HBCT_TOKEN_ADDRESS',
    'DEPOSIT_WALLET_ADDRESS',
    'WITHDRAWAL_WALLET_ADDRESS',
    'WITHDRAWAL_PRIVATE_KEY',
  ],
};

const developmentConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
  ],
  optional: [
    ...productionConfig.required.filter(v => v !== 'DATABASE_URL'),
    ...productionConfig.optional,
  ],
};

/**
 * Validates environment variables based on the current NODE_ENV
 * In production, throws an error if required variables are missing
 * In development, logs warnings for missing optional variables
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = isProduction ? productionConfig : developmentConfig;

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Check required variables
  for (const envVar of config.required) {
    if (!process.env[envVar]) {
      missingRequired.push(envVar);
    }
  }

  // Check optional variables
  for (const envVar of config.optional) {
    if (!process.env[envVar]) {
      missingOptional.push(envVar);
    }
  }

  // Report missing required variables
  if (missingRequired.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingRequired.join(', ')}`;
    if (isProduction) {
      logger.error(errorMessage);
      throw new Error(errorMessage);
    } else {
      logger.warn(errorMessage);
    }
  }

  // Report missing optional variables (only in development for debugging)
  if (!isProduction && missingOptional.length > 0) {
    logger.debug(`Missing optional environment variables: ${missingOptional.join(', ')}`);
  }

  logger.log('Environment validation completed successfully');
}

/**
 * Validates a specific environment variable
 * Returns the value if present, throws error if required and missing
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Gets an environment variable with a default value for development
 * Throws error in production if not set
 */
export function getEnvWithDevDefault(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment variable ${name} is required in production`);
    }
    return devDefault;
  }
  return value;
}
