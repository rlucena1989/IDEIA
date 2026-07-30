export type EncryptionAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305';

export interface KeyInfo {
  id: string;
  algorithm: EncryptionAlgorithm;
  createdAt: Date;
  rotationDue: Date;
}

export interface EncryptedData {
  iv: string;
  ciphertext: string;
  tag: string;
  algorithm: EncryptionAlgorithm;
  keyId: string;
}
