import path from 'path';

import type { LanguageConfig } from './types';

export function cppConfig(dir: string, sandbox: string): LanguageConfig {
  const mainFile = path.join(dir, 'main.cpp');
  const binary = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
  return {
    mainFile,
    compileCmd: ['g++', '-O2', '-std=c++17', '-o', binary, mainFile],
    runCmd: [binary]
  };
}
