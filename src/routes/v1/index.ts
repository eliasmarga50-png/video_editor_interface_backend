import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { autoEditRouter } from './auto-edit.routes.js';
import { brollRouter } from './broll.routes.js';
import { providersRouter } from './providers.routes.js';
import { transcribeRouter } from './transcribe.routes.js';
import { videoGenRouter } from './video-gen.routes.js';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/transcribe', transcribeRouter);
v1Router.use('/broll-keywords', brollRouter);
v1Router.use('/generate-video', videoGenRouter);
v1Router.use('/auto-edit', autoEditRouter);
v1Router.use('/providers', providersRouter);
