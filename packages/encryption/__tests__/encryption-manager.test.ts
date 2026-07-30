import { EncryptionManager } from '../src/encryption-manager';

describe('EncryptionManager', () => {
  let manager: EncryptionManager;

  beforeEach(() => {
    manager = new EncryptionManager();
  });

  it('should generate a key', () => {
    const keyInfo = manager.generateKey();
    expect(keyInfo.id).toBeDefined();
    expect(keyInfo.algorithm).toBe('aes-256-gcm');
    expect(keyInfo.createdAt).toBeInstanceOf(Date);
    expect(keyInfo.rotationDue).toBeInstanceOf(Date);
  });

  it('should generate key with chacha20-poly1305', () => {
    const keyInfo = manager.generateKey('chacha20-poly1305');
    expect(keyInfo.algorithm).toBe('chacha20-poly1305');
  });

  it('should encrypt and decrypt text', () => {
    manager.generateKey();
    const plaintext = 'Hello, World!';

    const encrypted = manager.encrypt(plaintext);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = manager.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt with specific key', () => {
    const keyInfo = manager.generateKey();
    manager.generateKey();

    const encrypted = manager.encrypt('Secret data', keyInfo.id);
    expect(encrypted.keyId).toBe(keyInfo.id);

    const decrypted = manager.decrypt(encrypted);
    expect(decrypted).toBe('Secret data');
  });

  it('should encrypt with different algorithms', () => {
    manager.generateKey();
    manager.generateKey('chacha20-poly1305');

    const aesEncrypted = manager.encrypt('AES data');
    expect(aesEncrypted.algorithm).toBe('aes-256-gcm');
    expect(aesEncrypted.iv.length).toBe(32);

    const chachaEncrypted = manager.encrypt('ChaCha data');
    expect(chachaEncrypted.algorithm).toBe('aes-256-gcm');
  });

  it('should handle empty string', () => {
    manager.generateKey();
    const encrypted = manager.encrypt('');
    const decrypted = manager.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should throw on unknown key for encryption', () => {
    expect(() => manager.encrypt('data', 'nonexistent-key')).toThrow('Key not found');
  });

  it('should throw on unknown key for decryption', () => {
    manager.generateKey();
    const encrypted = manager.encrypt('data');
    encrypted.keyId = 'unknown-key';

    expect(() => manager.decrypt(encrypted)).toThrow('Key not found');
  });

  it('should rotate keys', () => {
    const firstKey = manager.generateKey();
    expect(manager.getActiveKeyId()).toBe(firstKey.id);

    const rotatedKey = manager.rotateKey();
    expect(rotatedKey.id).not.toBe(firstKey.id);
    expect(manager.getActiveKeyId()).toBe(rotatedKey.id);
  });

  it('should list all keys', () => {
    expect(manager.listKeys()).toHaveLength(0);

    manager.generateKey();
    expect(manager.listKeys()).toHaveLength(1);

    manager.generateKey();
    expect(manager.listKeys()).toHaveLength(2);
  });

  it('should encrypt and decrypt large text', () => {
    manager.generateKey();
    const large = 'A'.repeat(10000);

    const encrypted = manager.encrypt(large);
    const decrypted = manager.decrypt(encrypted);

    expect(decrypted).toBe(large);
    expect(decrypted.length).toBe(10000);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    manager.generateKey();
    const plaintext = 'Same text';

    const enc1 = manager.encrypt(plaintext);
    const enc2 = manager.encrypt(plaintext);

    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it('should get active key id', () => {
    expect(manager.getActiveKeyId()).toBeNull();

    manager.generateKey();
    expect(manager.getActiveKeyId()).not.toBeNull();
  });
});
