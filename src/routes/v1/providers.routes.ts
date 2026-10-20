import { Router } from 'express';
import { llmService, mediaService } from '../../container.js';

export const providersRouter = Router();

// GET /api/v1/providers
providersRouter.get('/', (_req, res) => {
  const llmProviders = llmService.listProviders();
  const mediaProviders = mediaService.listProviders();
  const activeLlm = llmService.getProvider();
  const activeMedia = mediaService.getProvider();

  res.json({
    success: true,
    data: {
      active: {
        llm: {
          id: activeLlm.id,
          name: activeLlm.displayName,
          isFreeTier: activeLlm.isFreeTier,
        },
        media: {
          id: activeMedia.id,
          name: activeMedia.displayName,
          isFreeTier: activeMedia.isFreeTier,
          limitations: activeMedia.getLimitations(),
        },
      },
      llmProviders,
      mediaProviders,
    },
  });
});
