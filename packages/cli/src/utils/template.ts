import fs from "node:fs";
import path from "node:path";

/**
 * Busca template ai dir.
 * @returns O resultado da operação.
 */
export function findTemplateAiDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../templates/.ai"),
    path.resolve(__dirname, "../templates/.ai"),
    path.resolve(__dirname, "../../../../.ai"),
    path.resolve(__dirname, "../../../../../.ai"),
    path.resolve(process.cwd(), ".ai-template")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error("AI-DevKit template .ai directory not found. Checked: " + candidates.join(", "));
}
