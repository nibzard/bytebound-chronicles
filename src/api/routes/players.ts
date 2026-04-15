import { FastifyInstance } from 'fastify';
import { db } from '../services';
import { 
  throwNotFound, 
  createValidationMiddleware 
} from '../middleware';
import { 
  CreatePlayerSchema, 
  UpdatePlayerSchema, 
  PlayerParamsSchema 
} from '../schemas';
import { nanoid } from 'nanoid';

export default async function playerRoutes(server: FastifyInstance) {
  // Validation middleware
  const validatePlayerParams = createValidationMiddleware({ params: PlayerParamsSchema });
  const validateCreatePlayer = createValidationMiddleware({ body: CreatePlayerSchema });
  const validateUpdatePlayer = createValidationMiddleware({ body: UpdatePlayerSchema });

  server.post('/players', { preHandler: validateCreatePlayer }, async (request) => {
    const playerData = request.body as any;
    
    // Generate unique ID if not provided
    if (!playerData.id) {
      playerData.id = nanoid();
    }
    
    // Set timestamps
    playerData.createdAt = new Date().toISOString();
    playerData.lastLoginAt = new Date().toISOString();
    
    await db.createPlayerProfile(playerData);
    
    return {
      id: playerData.id,
      name: playerData.name,
      email: playerData.email,
      preferences: playerData.preferences,
      createdAt: playerData.createdAt,
      updatedAt: playerData.createdAt,
    };
  });

  server.get('/players/:id', { preHandler: validatePlayerParams }, async (request) => {
    const { id } = request.params as { id: string };
    const player = await db.getPlayerProfile(id);
    
    if (!player) {
      throwNotFound('Player', id);
    }
    
    return player;
  });

  server.put('/players/:id', { 
    preHandler: [validatePlayerParams, validateUpdatePlayer] 
  }, async (request) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;
    
    // Check if player exists first
    const existingPlayer = await db.getPlayerProfile(id);
    if (!existingPlayer) {
      throwNotFound('Player', id);
    }
    
    // Set update timestamp
    updates.updatedAt = new Date().toISOString();
    
    await db.updatePlayerProfile(id, updates);
    
    return { 
      success: true, 
      message: 'Player profile updated successfully',
      updatedAt: updates.updatedAt,
    };
  });

  server.delete('/players/:id', { preHandler: validatePlayerParams }, async (request) => {
    const { id } = request.params as { id: string };
    
    // Check if player exists first
    const existingPlayer = await db.getPlayerProfile(id);
    if (!existingPlayer) {
      throwNotFound('Player', id);
    }
    
    const deleted = await db.deletePlayerProfile(id);
    
    if (!deleted) {
      throw new Error('Failed to delete player profile');
    }
    
    return {
      success: true,
      message: 'Player profile deleted successfully',
      deletedAt: new Date().toISOString(),
    };
  });
}
