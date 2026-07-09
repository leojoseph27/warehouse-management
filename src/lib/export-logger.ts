/**
 * Append-only logger for export jobs.
 *
 * Every chunk, every stage transition, and every error gets a log row
 * in the ExportLog table. This lets us inspect failed exports later
 * without grepping Vercel logs (which roll over quickly).
 *
 * Usage:
 *   const logger = createExportLogger(jobId);
 *   await logger.info('process', `Chunk ${n} started`, { chunkNumber: n });
 *   await logger.error('process', `Image download failed`, { url, error: err.message });
 *
 * The logger is fire-and-forget — it never throws. If the DB write fails,
 * it falls back to console.error so we still see the message.
 */

import { db } from '@/lib/db';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ExportLogger {
  debug: (source: string, message: string, context?: Record<string, any>) => Promise<void>;
  info:  (source: string, message: string, context?: Record<string, any>) => Promise<void>;
  warn:  (source: string, message: string, context?: Record<string, any>) => Promise<void>;
  error: (source: string, message: string, context?: Record<string, any>) => Promise<void>;
  log:   (level: LogLevel, source: string, message: string, context?: Record<string, any>) => Promise<void>;
}

export function createExportLogger(jobId: string): ExportLogger {
  const log = async (
    level: LogLevel,
    source: string,
    message: string,
    context?: Record<string, any>,
  ): Promise<void> => {
    const contextJson = context ? JSON.stringify(context) : null;
    try {
      await db.exportLog.create({
        data: { jobId, level, source, message, contextJson },
      });
    } catch (err: any) {
      // Don't let logging failures break the export — fall back to console.
      console.error(`[ExportLog ${jobId}] Failed to persist log:`, err?.message);
      console.error(`[ExportLog ${jobId}] [${level}] [${source}] ${message}`, context || '');
    }
  };

  return {
    debug: (s, m, c) => log('debug', s, m, c),
    info:  (s, m, c) => log('info',  s, m, c),
    warn:  (s, m, c) => log('warn',  s, m, c),
    error: (s, m, c) => log('error', s, m, c),
    log,
  };
}
