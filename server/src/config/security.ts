// ============================================
// FICHIER: server/src/config/security.ts
// DESCRIPTION: Configuration de sécurité centralisée
// VERSION: 2.0.2 - Fix types jsonwebtoken stricts
// ============================================

import crypto from 'crypto';
import type { Algorithm } from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresInSeconds: number;  // En secondes pour compatibilité jsonwebtoken
  jwtAlgorithm: Algorithm;
  bcryptRounds: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  rateLimitAuthMax: number;
  corsOrigins: string[];
  secureCookies: boolean;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Convertit une durée string (ex: "8h", "7d", "30m") en secondes
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Défaut: 8 heures
    return 8 * 60 * 60;
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 8 * 60 * 60;
  }
}

// ============================================
// VALIDATION
// ============================================

interface EnvValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateEnvironment(): EnvValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  const requiredDb = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  for (const varName of requiredDb) {
    if (!process.env[varName]) {
      errors.push(`Missing: ${varName}`);
    }
  }

  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET is required in production');
    } else {
      warnings.push('JWT_SECRET not set - using generated dev secret');
    }
  } else {
    const secret = process.env.JWT_SECRET;
    
    if (secret.length < 32) {
      if (isProduction) {
        errors.push('JWT_SECRET must be at least 32 characters');
      } else {
        warnings.push('JWT_SECRET is short - use 64+ chars in production');
      }
    }

    const dangerous = [
      'your-secret', 'change-me', 'changeme', 'password', 'secret123',
      'mysecret', 'default', 'example', 'test-secret', 'dev-secret'
    ];

    for (const pattern of dangerous) {
      if (secret.toLowerCase().includes(pattern)) {
        if (isProduction) {
          errors.push(`JWT_SECRET contains dangerous pattern: "${pattern}"`);
        } else {
          warnings.push('JWT_SECRET appears to be a placeholder');
        }
        break;
      }
    }
  }

  if (isProduction && !process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL not set - CORS may be too permissive');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================
// GÉNÉRATION SECRET DEV
// ============================================

function generateDevSecret(): string {
  const machineId = process.pid.toString();
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(32).toString('hex');
  
  return crypto
    .createHash('sha512')
    .update(`${machineId}-${timestamp}-${random}`)
    .digest('hex');
}

// ============================================
// INITIALISATION
// ============================================

let securityConfig: SecurityConfig | null = null;

export async function initializeSecurity(): Promise<SecurityConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('\n🔐 Initializing security...');
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'development'}`);

  const validation = validateEnvironment();

  for (const warning of validation.warnings) {
    console.warn(`   ⚠️  ${warning}`);
  }

  if (!validation.isValid) {
    console.error('\n❌ SECURITY VALIDATION FAILED:');
    for (const error of validation.errors) {
      console.error(`   ✗ ${error}`);
    }
    
    if (isProduction) {
      console.error('\n💡 To fix this:');
      console.error('   1. Generate a secret: openssl rand -hex 64');
      console.error('   2. Set JWT_SECRET in your .env file');
      console.error('   3. Ensure all DB variables are set\n');
      process.exit(1);
    }
  }

  let jwtSecret: string;
  
  if (process.env.JWT_SECRET) {
    jwtSecret = process.env.JWT_SECRET;
    console.log('   ✅ JWT_SECRET loaded from environment');
  } else if (!isProduction) {
    jwtSecret = generateDevSecret();
    console.log('   ⚠️  Using generated dev secret (will change on restart)');
  } else {
    throw new Error('JWT_SECRET is required in production');
  }

  const corsOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000'];

  // Convertir la durée en secondes
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const jwtExpiresInSeconds = parseDurationToSeconds(jwtExpiresIn);

  securityConfig = {
    jwtSecret,
    jwtExpiresInSeconds,
    jwtAlgorithm: 'HS512' as Algorithm,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
    corsOrigins,
    secureCookies: isProduction
  };

  console.log('   ✅ Security configuration complete');
  console.log(`   📋 JWT Algorithm: ${securityConfig.jwtAlgorithm}`);
  console.log(`   📋 JWT Expires: ${jwtExpiresIn} (${jwtExpiresInSeconds}s)`);
  console.log(`   📋 Bcrypt Rounds: ${securityConfig.bcryptRounds}`);
  console.log(`   📋 Rate Limit: ${securityConfig.rateLimitMax} req/${securityConfig.rateLimitWindow/60000}min`);

  return securityConfig;
}

// ============================================
// ACCESSEURS
// ============================================

export function getSecurityConfig(): SecurityConfig {
  if (!securityConfig) {
    throw new Error('Security not initialized. Call initializeSecurity() first.');
  }
  return securityConfig;
}

export function getJwtSecret(): string {
  return getSecurityConfig().jwtSecret;
}

export function getJwtAlgorithm(): Algorithm {
  return getSecurityConfig().jwtAlgorithm;
}

export function getJwtExpiresInSeconds(): number {
  return getSecurityConfig().jwtExpiresInSeconds;
}

// ============================================
// UTILITAIRES PUBLICS
// ============================================

export function generateSecureSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

export default {
  initializeSecurity,
  getSecurityConfig,
  getJwtSecret,
  getJwtAlgorithm,
  getJwtExpiresInSeconds,
  generateSecureSecret
};