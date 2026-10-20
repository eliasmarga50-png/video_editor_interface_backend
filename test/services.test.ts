import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmService } from '../src/services/llm/llm.service.js';
import { MediaService } from '../src/services/media/media.service.js';
import { InMemoryTaskStore } from '../src/infrastructure/task-store.js';
import { VideoGenService } from '../src/services/video_gen.service.js';
import { AutoEditService } from '../src/services/auto_edit.service.js';

test('LlmService lists all registered providers and identifies free tier', () => {
  const llm = new LlmService();
  const providers = llm.listProviders();

  assert.ok(providers.length >= 6, 'Should have at least 6 providers');

  const gemini = providers.find((p) => p.id === 'gemini');
  assert.ok(gemini, 'Gemini provider should exist');
  assert.equal(gemini.isFreeTier, true, 'Gemini should be marked free tier');

  const groq = providers.find((p) => p.id === 'groq');
  assert.ok(groq, 'Groq provider should exist');
  assert.equal(groq.isFreeTier, true, 'Groq should be marked free tier');

  const dev = providers.find((p) => p.id === 'development');
  assert.ok(dev, 'Development provider should exist');
  assert.equal(dev.isConfigured, true, 'Development provider is always configured');
});

test('LlmService produces valid structured plan using fallback development provider', async () => {
  const llm = new LlmService();
  const result = await llm.completeJson<{ title: string; scenes: unknown[] }>(
    'You are a video director. Return ONLY JSON: { title: string, scenes: [] }',
    JSON.stringify({ prompt: 'Cyberpunk Tokyo street at night' }),
  );

  assert.ok(result.text, 'Should have non-empty text');
  assert.ok(result.parsed, 'Should parse JSON');
  assert.equal(typeof result.parsed.title, 'string');
});

test('MediaService generates playable media and clip structure', async () => {
  const media = new MediaService();
  const result = await media.generateVideo({
    prompt: 'Mountain sunrise time lapse',
    durationSeconds: 15,
    aspectRatio: '9:16',
  });

  assert.ok(result.outputUrl, 'Must return a playable output URL');
  assert.equal(result.aspectRatio, '9:16');
  assert.ok(result.clips.length > 0, 'Must produce video clips');
  assert.equal(typeof result.clips[0].url, 'string');
});

test('VideoGenService runs full asynchronous workflow and finishes succeeded', async () => {
  const store = new InMemoryTaskStore();
  const llm = new LlmService();
  const media = new MediaService();
  const videoGen = new VideoGenService(store, llm, media);

  const task = await videoGen.createTask({
    prompt: 'Surfing giant waves in Nazare Portugal',
    style: 'Cinematic',
    durationSeconds: 15,
    aspectRatio: '9:16',
    vibe: 'hype',
  });

  assert.ok(task.taskId, 'Should generate task id');
  assert.ok(task.statusUrl, 'Should provide status url');

  // Wait briefly for the async pipeline to complete
  let finished = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const polled = await videoGen.getTask(task.taskId);
    if (polled.status === 'succeeded' || polled.status === 'failed') {
      assert.equal(polled.status, 'succeeded', `Task failed with: ${polled.error}`);
      assert.ok(polled.outputUrl, 'Must have outputUrl');
      assert.ok(polled.clips && polled.clips.length > 0, 'Must have clips');
      assert.ok(polled.aiTrace, 'Must have aiTrace');
      finished = true;
      break;
    }
  }
  assert.ok(finished, 'Video generation task should complete in reasonable time');
});

test('AutoEditService runs auto-edit pipeline and creates narrative arc', async () => {
  const store = new InMemoryTaskStore();
  const llm = new LlmService();
  const media = new MediaService();
  const autoEdit = new AutoEditService(store, llm, media);

  const task = await autoEdit.createTask({
    title: 'Weekend in Kyoto',
    vibe: 'travel',
    platform: 'instagramReel',
    targetLengthMs: 15000,
    transcript: 'Walking through bamboo groves and visiting golden temples with friends.',
  });

  assert.ok(task.taskId, 'Should generate task id');

  let finished = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const polled = autoEdit.getTask(task.taskId);
    if (polled.status === 'succeeded' || polled.status === 'failed') {
      assert.equal(polled.status, 'succeeded', `Auto-edit failed with: ${polled.error}`);
      assert.ok(polled.outputVideoUrl, 'Must produce output video URL');
      assert.ok(polled.aiEditTrace, 'Must produce aiEditTrace');
      finished = true;
      break;
    }
  }
  assert.ok(finished, 'Auto-edit task should complete');
});
