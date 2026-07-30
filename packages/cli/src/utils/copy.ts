import fs from "node:fs";
import { createLogger } from '@ideia/logger';
import path from "node:path";

/** Tipo que define copy mode. */
export type CopyMode = "safe" | "force" | "dry-run";

/** Interface que define a estrutura de copy result. */
export interface CopyResult {
  copied: string[];
  skipped: string[];
  overwritten: string[];
  backedUp: string[];
  errors: string[];
}

/** Tipo que define copy filter. */
export type CopyFilter = (relativePath: string) => boolean;

/**
 * Processa template directory.
 * @param sourceDir - Valor dir.
 * @param targetDir - Valor dir.
 * @param mode - Valor mode.
 * @param filterFn - Filtra fn.
 * @returns O resultado da operação.
 */
export function copyTemplateDirectory(sourceDir: string, targetDir: string, mode: CopyMode, filterFn?: CopyFilter): CopyResult {
  const result: CopyResult = {
    copied: [],
    skipped: [],
    overwritten: [],
    backedUp: [],
    errors: []
  };

  const backupRoot = path.join(targetDir, "backups", "setup", new Date().toISOString().replace(/[:.]/g, "-"));

  function copyRecursive(src: string, dest: string, relativePath: string = "") {
    if (!fs.existsSync(src)) return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      // Para diretórios, sempre permitir a travessia quando há include list
      // O filtro será aplicado nos arquivos individualmente
      // Apenas bloquear diretórios explicitamente excluídos (exclude list)
      if (filterFn && relativePath) {
        // Verificar se é uma exclusão de diretório completo (apenas para exclude list)
        // Para include list, sempre permitir travessia
        const testPath = relativePath + "/";
        if (!filterFn(testPath) && !filterFn(relativePath)) {
          // Se o diretório é excluído tanto como "dir/" quanto como "dir", pular
          // Mas precisamos verificar se é include ou exclude list
          // Uma forma simples: se filterFn retorna false para o diretório, pular
          return;
        }
      }
      
      if (mode !== "dry-run" && !fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      for (const file of fs.readdirSync(src)) {
        const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
        copyRecursive(path.join(src, file), path.join(dest, file), newRelativePath);
      }
    } else {
      // Aplicar filtro no arquivo
      if (filterFn && !filterFn(relativePath)) {
        return;
      }
      
      if (fs.existsSync(dest)) {
        if (mode === "force") {
          const backupPath = path.join(backupRoot, path.relative(targetDir, dest));
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
          fs.copyFileSync(dest, backupPath);
          fs.copyFileSync(src, dest);
          result.backedUp.push(backupPath);
          result.overwritten.push(dest);
        } else {
          result.skipped.push(dest);
        }
      } else {
        if (mode !== "dry-run") {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
        result.copied.push(dest);
      }
    }
  }

  try {
    copyRecursive(sourceDir, targetDir);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
  }

  return result;
}
