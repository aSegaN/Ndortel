// ============================================
// FICHIER: server/src/services/secretsManager.ts
// DESCRIPTION: Gestionnaire de secrets sécurisé
// VERSION: 2.0.3 - Fix import AWS optionnel
// SUPPORT: Variables d'env, fichiers, AWS SSM, HashiCorp Vault
// ============================================

import fs from 'fs';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export type SecretProvider = 'env' | 'file' | 'aws-ssm' | 'vault';

export interface SecretConfig {
  provider: SecretProvider;
  filePath?: string;
  awsRegion?: string;
  awsParameterPath?: string;
  vaultAddr?: string;
  vaultToken?: string;
  vaultPath?: string;
}

export interface SecretsManagerOptions {
  providers: SecretConfig[];
  requiredSecrets: string[];
  minSecretLength?: number;
  validateStrength?: boolean;
}

interface SecretValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Type pour la réponse Vault
interface VaultResponse {
  data?: {
    data?: Record<string, unknown>;
  } & Record<string, unknown>;
}

// ============================================
// CLASSE PRINCIPALE
// ============================================

export class SecretsManager {
  private secrets: Map<string, string> = new Map();
  private options: SecretsManagerOptions;
  private initialized: boolean = false;

  constructor(options: SecretsManagerOptions) {
    this.options = {
      minSecretLength: 32,
      validateStrength: true,
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔐 Initializing Secrets Manager...');

    for (const providerConfig of this.options.providers) {
      try {
        await this.loadFromProvider(providerConfig);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Provider ${providerConfig.provider} failed: ${message}`);
      }
    }

    const validation = this.validateSecrets();
    
    if (!validation.isValid) {
      console.error('❌ FATAL: Secret validation failed:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      throw new Error('Required secrets are missing or invalid');
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warn => console.warn(`   ⚠️  ${warn}`));
    }

    this.initialized = true;
    console.log('   ✅ Secrets Manager initialized');
  }

  private async loadFromProvider(config: SecretConfig): Promise<void> {
    switch (config.provider) {
      case 'env':
        this.loadFromEnv();
        break;
      case 'file':
        if (config.filePath) {
          this.loadFromFile(config.filePath);
        }
        break;
      case 'aws-ssm':
        await this.loadFromAWSSSM(config);
        break;
      case 'vault':
        await this.loadFromVault(config);
        break;
    }
  }

  private loadFromEnv(): void {
    console.log('   📋 Loading secrets from environment...');
    
    for (const key of this.options.requiredSecrets) {
      const envKey = this.toEnvKey(key);
      const value = process.env[envKey];
      
      if (value && !this.secrets.has(key)) {
        this.secrets.set(key, value);
      }
    }
  }

  private loadFromFile(filePath: string): void {
    console.log(`   📁 Loading secrets from file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Secrets file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.trim().startsWith('{')) {
      const json = JSON.parse(content) as Record<string, unknown>;
      for (const [key, value] of Object.entries(json)) {
        if (typeof value === 'string' && !this.secrets.has(key)) {
          this.secrets.set(key, value);
        }
      }
    } else {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value && !this.secrets.has(key)) {
            this.secrets.set(key, value);
          }
        }
      }
    }
  }

  private async loadFromAWSSSM(config: SecretConfig): Promise<void> {
    console.log(`   ☁️  Loading secrets from AWS SSM: ${config.awsParameterPath}`);
    
    try {
      // Import dynamique - le module AWS SDK est optionnel
      // @ts-ignore - Module optionnel, peut ne pas être installé
      const awsSsm = await import('@aws-sdk/client-ssm');
      
      const { SSMClient, GetParametersByPathCommand } = awsSsm;
      
      const client = new SSMClient({ region: config.awsRegion || 'eu-west-3' });
      
      const command = new GetParametersByPathCommand({
        Path: config.awsParameterPath || '/ndortel/prod/',
        WithDecryption: true,
        Recursive: true
      });

      const response = await client.send(command);
      
      if (response.Parameters) {
        for (const param of response.Parameters) {
          if (param.Name && param.Value) {
            const key = param.Name.split('/').pop();
            if (key && !this.secrets.has(key)) {
              this.secrets.set(key, param.Value);
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Cannot find module') || message.includes('MODULE_NOT_FOUND')) {
        throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-ssm');
      }
      throw new Error(`AWS SSM error: ${message}`);
    }
  }

  private async loadFromVault(config: SecretConfig): Promise<void> {
    console.log(`   🔒 Loading secrets from Vault: ${config.vaultAddr}`);
    
    const vaultAddr = config.vaultAddr || process.env.VAULT_ADDR;
    const vaultToken = config.vaultToken || process.env.VAULT_TOKEN;
    const vaultPath = config.vaultPath || 'secret/data/ndortel';

    if (!vaultAddr || !vaultToken) {
      throw new Error('Vault address and token are required');
    }

    const response = await fetch(`${vaultAddr}/v1/${vaultPath}`, {
      headers: { 'X-Vault-Token': vaultToken }
    });

    if (!response.ok) {
      throw new Error(`Vault request failed: ${response.status}`);
    }

    const data = await response.json() as VaultResponse;
    
    // Vault KV v2 stocke les données dans data.data.data
    // Vault KV v1 stocke les données dans data.data
    const secrets: Record<string, unknown> = data?.data?.data || data?.data || {};

    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === 'string' && !this.secrets.has(key)) {
        this.secrets.set(key, value);
      }
    }
  }

  private validateSecrets(): SecretValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    for (const secretName of this.options.requiredSecrets) {
      const value = this.secrets.get(secretName);

      if (!value) {
        errors.push(`Missing required secret: ${secretName}`);
        continue;
      }

      const minLength = this.options.minSecretLength ?? 32;
      if (value.length < minLength) {
        if (isProduction) {
          errors.push(`Secret ${secretName} is too short (min ${minLength} chars)`);
        } else {
          warnings.push(`Secret ${secretName} is short (${value.length} chars) - OK for dev`);
        }
      }

      if (this.options.validateStrength && isProduction) {
        const strength = this.assessSecretStrength(value);
        if (strength < 0.6) {
          errors.push(`Secret ${secretName} is too weak for production`);
        }
      }

      const dangerousDefaults = [
        'your-secret-key', 'change-me', 'changeme', 'password', 
        'secret', 'default', 'test', 'dev', 'example'
      ];
      
      if (dangerousDefaults.some(d => value.toLowerCase().includes(d))) {
        if (isProduction) {
          errors.push(`Secret ${secretName} contains a default/test value`);
        } else {
          warnings.push(`Secret ${secretName} appears to be a placeholder`);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private assessSecretStrength(secret: string): number {
    let score = 0;
    if (secret.length >= 32) score += 0.2;
    if (secret.length >= 64) score += 0.2;
    if (/[a-z]/.test(secret)) score += 0.1;
    if (/[A-Z]/.test(secret)) score += 0.1;
    if (/[0-9]/.test(secret)) score += 0.1;
    if (/[^a-zA-Z0-9]/.test(secret)) score += 0.1;
    
    const entropy = this.calculateEntropy(secret);
    if (entropy > 3) score += 0.1;
    if (entropy > 4) score += 0.1;

    return Math.min(score, 1);
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  get(name: string): string {
    if (!this.initialized) {
      throw new Error('SecretsManager not initialized');
    }
    const value = this.secrets.get(name);
    if (!value) {
      throw new Error(`Secret not found: ${name}`);
    }
    return value;
  }

  getOptional(name: string): string | undefined {
    if (!this.initialized) {
      throw new Error('SecretsManager not initialized');
    }
    return this.secrets.get(name);
  }

  has(name: string): boolean {
    return this.secrets.has(name);
  }

  private toEnvKey(key: string): string {
    return key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  }

  static generateSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

// ============================================
// SINGLETON
// ============================================

let instance: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!instance) {
    throw new Error('SecretsManager not configured');
  }
  return instance;
}

export function configureSecretsManager(options: SecretsManagerOptions): SecretsManager {
  instance = new SecretsManager(options);
  return instance;
}

export default SecretsManager;