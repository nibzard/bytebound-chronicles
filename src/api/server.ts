import 'dotenv/config';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import swaggerPlugin from '@fastify/swagger';
import { logger } from '../utils';
import storyRoutes from './routes/stories';
import gameRoutes from './routes/games';
import actionRoutes from './routes/actions';
import playerRoutes from './routes/players';
import { connectionManager } from './websocket';
import { createErrorHandler } from './middleware';

import { nanoid } from 'nanoid';

export const server = Fastify({
  logger,
  genReqId: () => nanoid(),
});

// Register Swagger documentation
server.register(swaggerPlugin, {
  swagger: {
    info: {
      title: 'Bytebound Chronicles API',
      description: 'API for the Terminal LLM Adventure Game engine with intelligent AI orchestration',
      version: '0.3.0',
      contact: {
        name: 'Bytebound Chronicles Team',
        email: 'support@bytebound.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    host: `${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '8080'}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'stories', description: 'Story discovery and metadata endpoints' },
      { name: 'games', description: 'Game session management endpoints' },
      { name: 'players', description: 'Player profile management endpoints' },
      { name: 'actions', description: 'Player action processing endpoints' },
    ],
    definitions: {
      Error: {
        type: 'object',
        required: ['error', 'message', 'timestamp', 'path'],
        properties: {
          error: { type: 'string', description: 'Error type' },
          message: { type: 'string', description: 'Error message' },
          code: { type: 'string', description: 'Error code' },
          details: { type: 'object', description: 'Additional error details' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', description: 'Request path' },
          requestId: { type: 'string', description: 'Request ID for tracking' },
        },
      },
      Player: {
        type: 'object',
        required: ['id', 'name', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          preferences: {
            type: 'object',
            properties: {
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              narrativeStyle: { type: 'string', enum: ['descriptive', 'concise', 'atmospheric', 'action-packed'] },
              aiPersonality: { type: 'string', enum: ['helpful', 'challenging', 'immersive', 'educational'] },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Story: {
        type: 'object',
        required: ['id', 'title', 'description', 'author', 'version', 'genre', 'difficulty'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          author: { type: 'string' },
          version: { type: 'string' },
          genre: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          estimatedPlaytime: { type: 'number', description: 'Estimated playtime in minutes' },
          contentWarnings: { type: 'array', items: { type: 'string' } },
          isAvailable: { type: 'boolean' },
        },
      },
      Game: {
        type: 'object',
        required: ['id', 'storyId', 'playerId', 'status', 'currentBeat', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          storyId: { type: 'string' },
          playerId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'paused', 'completed', 'abandoned'] },
          currentBeat: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          lastActivity: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
});

// Register error handler
server.setErrorHandler(createErrorHandler(process.env.NODE_ENV === 'development'));

// Register WebSocket support
server.register(websocketPlugin);

// WebSocket route for game connections
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection) => {
    const connectionId = connectionManager.addConnection(connection.socket);
    
    connection.socket.on('close', () => {
      connectionManager.removeConnection(connectionId);
    });
  });
});

// Register API routes
server.register(storyRoutes, { prefix: '/api' });
server.register(gameRoutes, { prefix: '/api' });
server.register(actionRoutes, { prefix: '/api' });
server.register(playerRoutes, { prefix: '/api' });

// Swagger UI route
server.get('/docs', async (_, reply) => {
  return reply.type('text/html').send(`
<!DOCTYPE html>
<html>
  <head>
    <title>Bytebound Chronicles API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        SwaggerUIBundle({
          url: '/docs/json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout"
        });
      };
    </script>
  </body>
</html>
  `);
});

// Swagger JSON route
server.get('/docs/json', async () => {
  return server.swagger();
});

// Health check endpoint
server.get('/health', async () => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    connections: {
      websocket: connectionManager.getConnectionCount(),
    },
    version: '0.3.0',
  };
});

server.get('/', async () => {
  return { 
    message: 'Bytebound Chronicles API',
    version: '0.3.0',
    documentation: '/docs',
    websocket: '/ws',
    health: '/health',
  };
});

export const start = async () => {
  try {
    const port = parseInt(process.env.API_PORT || '8080');
    await server.listen({ port });
    
    // Start WebSocket connection management
    connectionManager.startHeartbeat(5); // 5-minute heartbeat
    
    // Cleanup stale connections every 10 minutes
    setInterval(() => {
      connectionManager.cleanupStaleConnections(30); // 30-minute timeout
    }, 10 * 60 * 1000);
    
    logger.info(`Server started with WebSocket support on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Check if this file is being run directly (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
