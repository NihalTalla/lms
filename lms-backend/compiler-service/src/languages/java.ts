import path from 'path';

import type { LanguageConfig } from './types';

export function javaConfig(dir: string, sandbox: string): LanguageConfig {
  const mainFile = path.join(dir, 'Main.java');
  return {
    mainFile,
    compileCmd: ['javac', mainFile, '-d', dir],
    runCmd: ['java', '-cp', dir, '-Xmx100m', '-Xss4m', '-Xms32m', 'Main']
  };
}
