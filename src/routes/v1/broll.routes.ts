import { Router } from 'express';
import { brollKeywordsController } from '../../controllers/broll.controller.js';
import { brollKeywordsSchema } from '../../dto/requests.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const brollRouter = Router();

brollRouter.post('/', validate(brollKeywordsSchema), asyncHandler(brollKeywordsController));
