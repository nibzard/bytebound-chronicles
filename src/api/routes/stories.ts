import { FastifyInstance } from 'fastify';
import { storyMetadataService } from '../services';
import { throwNotFound, createValidationMiddleware } from '../middleware';
import { StoryParamsSchema, StoryQuerySchema } from '../schemas';

export default async function storyRoutes(server: FastifyInstance) {
  // Add validation middleware
  const validateStoryParams = createValidationMiddleware({ params: StoryParamsSchema });
  const validateStoryQuery = createValidationMiddleware({ query: StoryQuerySchema });

  server.get('/stories', { preHandler: validateStoryQuery }, async (request) => {
    const query = request.query as any;
    const catalog = await storyMetadataService.getStoryCatalog();
    
    // Apply filters if provided
    let filteredStories = catalog.stories;
    
    if (query.tags) {
      filteredStories = filteredStories.filter(story => 
        story.tags.some((g: string) => g.toLowerCase().includes(query.tags.toLowerCase()))
      );
    }
    
    if (query.difficulty) {
      filteredStories = filteredStories.filter(story => story.difficulty === query.difficulty);
    }
    
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredStories = filteredStories.filter(story =>
        story.title.toLowerCase().includes(searchTerm) ||
        story.description.toLowerCase().includes(searchTerm) ||
        story.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedStories = filteredStories.slice(startIndex, endIndex);
    
    return {
      stories: paginatedStories,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: filteredStories.length,
        pages: Math.ceil(filteredStories.length / query.limit),
      },
      filters: {
        genre: query.genre,
        difficulty: query.difficulty,
        search: query.search,
      },
    };
  });

  server.get('/stories/:id', { preHandler: validateStoryParams }, async (request) => {
    const { id } = request.params as { id: string };
    const story = await storyMetadataService.getStoryMetadata(id);
    
    if (!story) {
      throwNotFound('Story', id);
    }
    
    return story;
  });
}
