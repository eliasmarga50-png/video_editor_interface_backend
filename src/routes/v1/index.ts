import { Router } from 'express';
import { brollRouter } from './broll.routes.js';
import { transcribeRouter } from './transcribe.routes.js';
import { videoGenRouter } from './video-gen.routes.js';

export const v1Router = Router();

v1Router.use('/transcribe', transcribeRouter);
v1Router.use('/broll-keywords', brollRouter);
v1Router.use('/generate-video', videoGenRouter);
