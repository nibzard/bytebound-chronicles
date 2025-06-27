
// Copyright (c) 2025 Nikola Balic
// MIT License

import { z } from 'zod';
import { StoryBeatSchema } from './game.js';

export const StoryMetadataSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  tags: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  rating: z.number().min(0).max(5),
  estimatedDuration: z.number().min(1),
  dependencies: z.array(z.string()).optional(),
});

export const StoryFileSchema = z.object({
  metadata: StoryMetadataSchema,
  beats: z.array(StoryBeatSchema),
});

export const validateStoryFile = (data: unknown) => {
  return StoryFileSchema.safeParse(data);
};

export type StoryFile = z.infer<typeof StoryFileSchema>;
export type StoryMetadata = z.infer<typeof StoryMetadataSchema>;
