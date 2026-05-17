import path from 'path';

import type { LanguageConfig } from './types';

export function pythonConfig(dir: string, sandbox: string): LanguageConfig {
  const mainFile = path.join(dir, 'main.py');
  return {
    mainFile,
    runCmd: ['python3', '-u', mainFile]
  };
}
