import { mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors/app-error.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
mkdirSync(uploadDir, { recursive: true });

const allowedMime = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/flac',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const mediaUpload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowedMime.has(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(AppError.unsupportedMedia(`Unsupported media type: ${file.mimetype}`));
  },
});
