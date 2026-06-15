// src/utils/logger.ts
// Structured logging visible in Expo terminal (Metro bundler)

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const PREFIX = '[HireScope]';

function log(level: LogLevel, tag: string, message: string, data?: any) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `${PREFIX}[${level}][${tag}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 0) : data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: any) => log('DEBUG', tag, msg, data),
  info: (tag: string, msg: string, data?: any) => log('INFO', tag, msg, data),
  warn: (tag: string, msg: string, data?: any) => log('WARN', tag, msg, data),
  error: (tag: string, msg: string, data?: any) => log('ERROR', tag, msg, data),

  // Phase transition logging
  phase: (phase: string, detail: string) => log('INFO', 'Pipeline', `Phase: ${phase} — ${detail}`),

  // Salary extraction logging
  salary: (count: number, format: string) => log('INFO', 'Extractor', `Extracted ${count} salary values (${format})`),

  // URL discovery logging
  urlsDiscovered: (engine: string, count: number, query: string) => log('INFO', 'Discovery', `${engine}: found ${count} URLs for "${query}"`),
  urlsFiltered: (total: number, afterFilter: number) => log('INFO', 'Discovery', `URLs: ${total} raw → ${afterFilter} after filtering`),

  // Page scraping logging
  scrapeSuccess: (url: string, textLen: number) => log('INFO', 'Scraper', `OK (${textLen}c) ${url.slice(0, 80)}`),
  scrapeFail: (url: string, err: string) => log('WARN', 'Scraper', `FAIL: ${err} — ${url.slice(0, 80)}`),

  // AI model logging
  aiEnhance: (status: string) => log('INFO', 'AI', `Enhancement: ${status}`),
};
