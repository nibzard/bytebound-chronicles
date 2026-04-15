import { FastifyInstance } from 'fastify';
import { gameSessionService } from '../services';
import { GameSession } from '../../services/GameSessionService';

export default async function gameRoutes(server: FastifyInstance) {
  server.post('/games', async (request, reply) => {
    try {
      const { playerId, storyId, settings } = request.body as {
        playerId: string;
        storyId: string;
        settings?: Partial<GameSession['settings']>;
      };
      const session = await gameSessionService.createSession(playerId, storyId, settings);
      return session;
    } catch (error) {
      server.log.error(error, 'Failed to create game session');
      return reply.status(500).send({ error: 'Failed to create game session' });
    }
  });

  server.get('/games/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { playerId } = request.query as { playerId: string };
      const session = await gameSessionService.loadSession(id, playerId);
      return session;
    } catch (error) {
      server.log.error(error, 'Failed to load game session');
      return reply.status(500).send({ error: 'Failed to load game session' });
    }
  });

  server.put('/games/:id/pause', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { playerId } = request.body as { playerId: string };
      await gameSessionService.pauseSession(id, playerId);
      return { success: true };
    } catch (error) {
        server.log.error(error, 'Failed to pause game session');
        return reply.status(500).send({ error: 'Failed to pause game session' });
    }
  });

  server.put('/games/:id/resume', async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const { playerId } = request.body as { playerId: string };
        await gameSessionService.resumeSession(id, playerId);
        return { success: true };
    } catch (error) {
        server.log.error(error, 'Failed to resume game session');
        return reply.status(500).send({ error: 'Failed to resume game session' });
    }
  });

  server.post('/games/:id/save', async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const { playerId, saveName, description } = request.body as {
            playerId: string;
            saveName: string;
            description?: string;
        };
        const save = await gameSessionService.saveGame(id, playerId, saveName, description);
        return save;
    } catch (error) {
        server.log.error(error, 'Failed to save game');
        return reply.status(500).send({ error: 'Failed to save game' });
    }
  });

  server.delete('/games/:id', async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const { playerId } = request.body as { playerId: string };
        await gameSessionService.endSession(id, playerId, 'abandoned');
        return { success: true };
    } catch (error) {
        server.log.error(error, 'Failed to end game session');
        return reply.status(500).send({ error: 'Failed to end game session' });
    }
  });
}
