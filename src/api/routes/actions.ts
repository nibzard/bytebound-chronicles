import { FastifyInstance } from 'fastify';
import { gameSessionService } from '../services';
import { SessionAction } from '../../services/GameSessionService';

export default async function actionRoutes(server: FastifyInstance) {
  server.post('/games/:id/actions', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const action = request.body as SessionAction;
      action.sessionId = id;
      const result = await gameSessionService.processAction(action);
      return result;
    } catch (error) {
      server.log.error(error, 'Failed to process action');
      return reply.status(500).send({ error: 'Failed to process action' });
    }
  });
}
