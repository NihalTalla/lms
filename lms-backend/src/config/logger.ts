import pino from 'pino';

import { env } from './env';

const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

function hasPrettyTransport() {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

const usePrettyTransport = !isProd && !isTest && hasPrettyTransport();

export const logger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  ...(usePrettyTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      }
    : {})
});
