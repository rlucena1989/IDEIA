export class CredentialRotator {
  private rotationHistory: Array<{ keyName: string; rotatedAt: Date; oldPublicKey: string; newPublicKey: string }> = [];

  async rotateKey(
    currentSeed: Uint8Array,
    generateNewSeed: () => Promise<Uint8Array>,
    onRotation: (newSeed: Uint8Array, oldSeed: Uint8Array) => Promise<void>,
  ): Promise<{ newSeed: Uint8Array; oldPublicKey: string }> {
    const newSeed = await generateNewSeed();
    const oldPublicKey = Buffer.from(currentSeed).toString('hex');
    await onRotation(newSeed, currentSeed);
    this.rotationHistory.push({
      keyName: 'rotated-key',
      rotatedAt: new Date(),
      oldPublicKey,
      newPublicKey: Buffer.from(newSeed).toString('hex'),
    });
    return { newSeed, oldPublicKey };
  }

  getRotationHistory(): Array<{ keyName: string; rotatedAt: Date }> {
    return [...this.rotationHistory];
  }

  getRotationCount(): number {
    return this.rotationHistory.length;
  }
}
