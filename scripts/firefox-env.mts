// Playwright's Firefox won't start on macOS 27, which protects the real Firefox's app-data folder that it shares
// (microsoft/playwright#42768). Its own folder per run fixes it (a shared one breaks concurrent runs). Used by the
// browser specs, the smoke test and the benchmark.
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const prefix = 'playwright-firefox-';
const day = 24 * 60 * 60 * 1000;

/**
 * Firefox's environment for Playwright: on macOS, an app-data folder of its own, deleted when the process exits.
 * Folders left by runs that were stopped (Ctrl+C skips exit handlers) are deleted here once they're a day old.
 */
export function firefoxEnv(): NodeJS.ProcessEnv | undefined {
  if (process.platform !== 'darwin') {
    return undefined;
  }
  for (const entry of readdirSync(tmpdir())) {
    const path = join(tmpdir(), entry);
    try {
      if (entry.startsWith(prefix) && Date.now() - statSync(path).mtimeMs > day) {
        rmSync(path, { recursive: true, force: true });
      }
    } catch {
      // Gone already, or not ours to delete
    }
  }
  const appData = mkdtempSync(join(tmpdir(), prefix));
  process.on('exit', () => rmSync(appData, { recursive: true, force: true }));
  return { ...process.env, MOZ_APP_DATA: appData };
}
