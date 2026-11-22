import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolves to c:\TellTale reliably regardless of process.cwd()
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(currentDir, '..');

/**
 * Loads environment variables for TellTale.
 * Loading order & priority:
 * 1. Existing process.env (e.g. system environment variables)
 * 2. .env.local (local developer overrides, git-ignored)
 * 3. .env (shared defaults, git-ignored)
 */
export function loadAppEnv(rootDir?: string): void {
  const candidateDirs = [
    rootDir,
    projectRoot,
    process.cwd(),
  ].filter(Boolean) as string[];

  // Clean empty strings so dotenv can populate them
  if (process.env.GEMINI_API_KEY === '') {
    delete process.env.GEMINI_API_KEY;
  }

  for (const dir of candidateDirs) {
    const envPath = path.resolve(dir, '.env');
    const envLocalPath = path.resolve(dir, '.env.local');

    // Load .env first as base defaults
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }

    // Load .env.local with override: true so local keys ALWAYS take precedence
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true });
    }
  }
}

// Auto-initialize when imported
loadAppEnv();
