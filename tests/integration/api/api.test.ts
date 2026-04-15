import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { server } from '../../../src/api/server';
import { db } from '../../../src/api/services';
import { exec } from 'child_process';

let playerId: string;
let storyId: string;
let gameId: string;

beforeAll(async () => {
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
    // Create a player for testing
    const playerResponse = await supertest(server.server).post('/api/players').send({
        id: 'test-player',
        username: 'test-player',
        email: 'test-player@example.com',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
    });
    playerId = playerResponse.body.id;

    // Get a story for testing
    const storiesResponse = await supertest(server.server).get('/api/stories');
    storyId = storiesResponse.body.stories[0].id;
});

afterEach(async () => {
    await db.reset();
});

test('GET /', async () => {
  const response = await supertest(server.server).get('/');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ hello: 'world' });
});

test('GET /api/stories', async () => {
    const response = await supertest(server.server).get('/api/stories');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('stories');
    expect(response.body.stories.length).toBeGreaterThan(0);
});

test('GET /api/stories/:id', async () => {
    const response = await supertest(server.server).get(`/api/stories/${storyId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', storyId);
});

test('GET /api/stories/:id - Not Found', async () => {
    const response = await supertest(server.server).get('/api/stories/non-existent-story');
    expect(response.status).toBe(404);
});

test('POST /api/games', async () => {
    const response = await supertest(server.server).post('/api/games').send({
        playerId,
        storyId,
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    gameId = response.body.id;
});

test('GET /api/games/:id', async () => {
    const response = await supertest(server.server).get(`/api/games/${gameId}?playerId=${playerId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', gameId);
});

test('PUT /api/games/:id/pause', async () => {
    const response = await supertest(server.server).put(`/api/games/${gameId}/pause`).send({ playerId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
});

test('PUT /api/games/:id/resume', async () => {
    const response = await supertest(server.server).put(`/api/games/${gameId}/resume`).send({ playerId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
});

test('POST /api/games/:id/save', async () => {
    const response = await supertest(server.server).post(`/api/games/${gameId}/save`).send({
        playerId,
        saveName: 'test-save',
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
});

test('DELETE /api/games/:id', async () => {
    const response = await supertest(server.server).delete(`/api/games/${gameId}`).send({ playerId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
});
