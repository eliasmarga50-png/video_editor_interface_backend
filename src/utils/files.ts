import { unlink } from 'node:fs/promises';
import { logger } from './logger.js';

export async function safeUnlink(filePath: string | undefined): Promise<void> {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    logger.warn({ err: error, filePath }, 'Failed to delete temp upload');
  }
}
