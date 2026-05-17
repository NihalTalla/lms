import path from 'path';

import type { LanguageConfig } from './types';

export function cConfig(dir: string, sandbox: string): LanguageConfig {
  const mainFile = path.join(dir, 'main.c');
  const binary = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
  return {
    mainFile,
    compileCmd: ['gcc', '-O2', '-o', binary, mainFile, '-lm', '-std=c11'],
    runCmd: [binary]
  };
}
