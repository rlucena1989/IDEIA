import fs from "node:fs";
import path from "node:path";

/**
 * Obtém cli version.
 * @returns O resultado da operação.
 */
export function getCliVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, "../../package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      return pkg.version || "1.0.0";
    }
  } catch {}
  return "1.0.0";
}
