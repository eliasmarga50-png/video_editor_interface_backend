import { Router } from 'express';
import { autoEditService } from '../../container.js';

export const autoEditRouter = Router();

// POST /api/v1/auto-edit
autoEditRouter.post('/', async (req, res, next) => {
  try {
    const task = await autoEditService.createTask(req.body ?? {});
    res.status(202).json({
      success: true,
      data: task,
      meta: {
        taskId: task.taskId,
        statusUrl: `/api/v1/auto-edit/${task.taskId}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auto-edit/:taskId
autoEditRouter.get('/:taskId', (req, res, next) => {
  try {
    const task = autoEditService.getTask(req.params.taskId);
    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
});
