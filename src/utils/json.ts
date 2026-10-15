import { AppError } from '../domain/errors/app-error.js';

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw AppError.upstream('LLM did not return a JSON object', { raw });
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch (error) {
    throw AppError.upstream('Failed to parse LLM JSON', { raw, error });
  }
}
