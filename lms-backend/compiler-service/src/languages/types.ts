export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java';

export type LanguageConfig = {
  mainFile: string;
  compileCmd?: string[];
  runCmd: string[];
};
