#!/usr/bin/env node
// ============================================
// FICHIER: server/scripts/generate-secrets.js
// DESCRIPTION: Générateur de secrets sécurisés
// USAGE: node scripts/generate-secrets.js
// ============================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 NDORTEL - Générateur de Secrets Sécurisés\n');
console.log('═'.repeat(50));

// Générer les secrets
const secrets = {
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  DB_PASSWORD: crypto.randomBytes(24).toString('base64url'),
  API_KEY_INTERNAL: crypto.randomBytes(32).toString('hex')
};

console.log('\n📋 Secrets générés:\n');

for (const [name, value] of Object.entries(secrets)) {
  console.log(`${name}=`);
  console.log(`  ${value}\n`);
}

// Afficher des instructions
console.log('═'.repeat(50));
console.log('\n💡 Instructions:\n');
console.log('1. Copiez JWT_SECRET dans votre fichier .env');
console.log('2. Ne commitez JAMAIS ces valeurs dans Git');
console.log('3. En production, utilisez un gestionnaire de secrets');
console.log('   (AWS SSM, HashiCorp Vault, etc.)\n');

// Option: Générer un fichier .env.local
const args = process.argv.slice(2);

if (args.includes('--write')) {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  const envContent = `# ============================================
# SECRETS GÉNÉRÉS AUTOMATIQUEMENT
# Date: ${new Date().toISOString()}
# ⚠️  NE PAS COMMITER CE FICHIER
# ============================================

JWT_SECRET=${secrets.JWT_SECRET}

# Autres secrets à configurer manuellement:
# DB_PASSWORD=
# GEMINI_API_KEY=
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Fichier créé: ${envPath}`);
  console.log('   Renommez-le en .env après configuration\n');
}

if (args.includes('--json')) {
  const jsonPath = path.join(__dirname, '..', 'secrets.json');
  fs.writeFileSync(jsonPath, JSON.stringify(secrets, null, 2));
  console.log(`✅ Fichier JSON créé: ${jsonPath}`);
  console.log('   ⚠️  Supprimez ce fichier après utilisation\n');
}

// Vérifier la force des secrets
console.log('\n🔍 Validation des secrets:\n');

function assessStrength(secret) {
  let score = 0;
  if (secret.length >= 32) score++;
  if (secret.length >= 64) score++;
  if (/[a-z]/.test(secret)) score++;
  if (/[A-Z]/.test(secret)) score++;
  if (/[0-9]/.test(secret)) score++;
  return score;
}

for (const [name, value] of Object.entries(secrets)) {
  const strength = assessStrength(value);
  const bar = '█'.repeat(strength) + '░'.repeat(5 - strength);
  const status = strength >= 4 ? '✅' : strength >= 3 ? '⚠️' : '❌';
  console.log(`  ${status} ${name}: [${bar}] ${value.length} chars`);
}

console.log('\n✅ Tous les secrets sont prêts pour la production\n');