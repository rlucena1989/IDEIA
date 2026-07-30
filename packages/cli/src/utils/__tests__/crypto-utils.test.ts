import { deriveKey, encrypt, decrypt, generateKey, createTlsOptions } from '../crypto-utils';

describe('crypto-utils', () => {
  describe('deriveKey', () => {
    it('should produce a key with salt', () => {
      const result = deriveKey('my-passphrase');
      expect(result.key).toBeInstanceOf(Buffer);
      expect(result.key).toHaveLength(32);
      expect(result.salt).toEqual(expect.any(String));
    });

    it('should produce consistent key with same passphrase and salt', () => {
      const salt = Buffer.alloc(32, 0xaa);
      const r1 = deriveKey('pass', salt);
      const r2 = deriveKey('pass', salt);
      expect(r1.key.toString('hex')).toBe(r2.key.toString('hex'));
    });

    it('should produce different keys for different passphrases', () => {
      const salt = Buffer.alloc(32, 0xaa);
      const r1 = deriveKey('pass1', salt);
      const r2 = deriveKey('pass2', salt);
      expect(r1.key.toString('hex')).not.toBe(r2.key.toString('hex'));
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt with key buffer', () => {
      const key = Buffer.alloc(32, 0x42);
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt with passphrase', () => {
      const plaintext = 'Sensitive data here';
      const encrypted = encrypt(plaintext, 'my-passphrase');
      const decrypted = decrypt(encrypted, 'my-passphrase');
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts each time', () => {
      const key = Buffer.alloc(32, 0x42);
      const plaintext = 'same text';
      const e1 = encrypt(plaintext, key);
      const e2 = encrypt(plaintext, key);
      expect(e1.encrypted).not.toBe(e2.encrypted);
      expect(e1.iv).not.toBe(e2.iv);
    });

    it('should fail to decrypt with wrong key', () => {
      const key1 = Buffer.alloc(32, 0x42);
      const key2 = Buffer.alloc(32, 0x24);
      const encrypted = encrypt('secret', key1);
      expect(() => decrypt(encrypted, key2)).toThrow();
    });
  });

  describe('generateKey', () => {
    it('should return a hex string', () => {
      const key = generateKey();
      expect(key).toEqual(expect.any(String));
      expect(key).toHaveLength(64);
    });

    it('should return different keys on each call', () => {
      const k1 = generateKey();
      const k2 = generateKey();
      expect(k1).not.toBe(k2);
    });
  });

  describe('createTlsOptions', () => {
    it('should return TLS options without certPath', () => {
      const opts = createTlsOptions();
      expect(opts).toHaveProperty('minVersion', 'TLSv1.3');
      expect(opts).toHaveProperty('ciphers');
      expect(opts).not.toHaveProperty('key');
      expect(opts).not.toHaveProperty('cert');
    });
  });
});
