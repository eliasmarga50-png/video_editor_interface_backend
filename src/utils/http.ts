import { AppError } from '../domain/errors/app-error.js';
import { logger } from './logger.js';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export async function fetchJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      logger.error(
        { url, status: response.status, payload },
        'Upstream HTTP request failed',
      );
      throw AppError.upstream(
        `Upstream request failed (${response.status})`,
        payload,
        response.status >= 500 ? 502 : response.status,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw AppError.timeout(`Upstream request timed out: ${url}`);
    }
    throw AppError.upstream('Upstream request failed', error);
  } finally {
    clearTimeout(timeout);
  }
}

export function secondsToMs(seconds: number): number {
  return Math.round(seconds * 1000);
}
