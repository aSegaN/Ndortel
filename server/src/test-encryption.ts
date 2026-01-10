import { encryptionService } from './services/encryption.service';

async function test() {
  console.log('🔐 Test chiffrement AES-256-GCM\n');

  const original = 'Hello Sénégal! 🇸🇳';
  const encrypted = encryptionService.encrypt(original, 'doc-123');
  const decrypted = encryptionService.decrypt(encrypted, 'doc-123');
  
  console.log('Original:', original);
  console.log('Déchiffré:', decrypted.data.toString());
  console.log('✅ Match:', original === decrypted.data.toString());
}

test().catch(console.error);
