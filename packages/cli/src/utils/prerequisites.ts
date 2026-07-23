/**
 * Verifica prerequisites.
 * @param _targetDir - Valor dir.
 */
export function checkPrerequisites(_targetDir: string) {
  const nodeMajor = parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (nodeMajor < 18) {
    throw new Error(`Node.js >= 18 is required. Current version: ${process.versions.node}`);
  }
}
