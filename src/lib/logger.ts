type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_INDEX: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

const getThreshold = (): number => {
  const raw = process.env.CARIOT_LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (!raw || !LEVEL_INDEX[raw]) return LEVEL_INDEX.info;
  return LEVEL_INDEX[raw];
};

const formatLine = (level: LogLevel, message: string, data?: unknown): string => {
  const ts = new Date().toISOString();
  const head = `${ts} [cariot] [${level}] ${message}`;
  return data ? `${head} ${JSON.stringify(data)}` : head;
};

const emit = (line: string): void => {
  process.stderr.write(line + '\n');
};

const log = (level: LogLevel, message: string, data?: unknown): void => {
  if (LEVEL_INDEX[level] < getThreshold()) return;
  emit(formatLine(level, message, data));
};

export const logger = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};
