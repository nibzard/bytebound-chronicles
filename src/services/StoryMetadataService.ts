// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Story Metadata Service
 * Handles loading, caching, and management of story metadata from the universal schema
 * Provides spoiler-free metadata access while maintaining full story catalog
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { validateByteboundGame, type ByteboundGame } from '../validation/game-schema-validator.js';
import { StoryMetadata, StoryFilters } from '../types/story.js';
import { HybridDatabase } from '../database/HybridDatabase.js';

export interface StoryMetadataWithAvailability extends StoryMetadata {
  available: boolean;
  filePath: string;
  fileSize: number;
  lastModified: Date;
  validationStatus: 'valid' | 'invalid' | 'unknown';
  validationErrors?: string[];
}

export interface StoryCatalog {
  stories: StoryMetadataWithAvailability[];
  totalCount: number;
  lastUpdated: Date;
  catalogVersion: string;
}

export interface StoryMetadataServiceConfig {
  storiesDirectory: string;
  enableCaching: boolean;
  cacheExpiryMinutes: number;
  autoValidateStories: boolean;
  database?: HybridDatabase;
}

export class StoryMetadataService {
  private catalog: StoryCatalog | null = null;
  private lastCatalogUpdate: Date | null = null;
  private storyCache = new Map<string, ByteboundGame>();
  private validationCache = new Map<string, { valid: boolean; errors: string[]; timestamp: Date }>();

  constructor(private config: StoryMetadataServiceConfig) {}

  /**
   * Get catalog of all available stories with metadata
   */
  async getStoryCatalog(forceRefresh = false): Promise<StoryCatalog> {
    if (!forceRefresh && this.catalog && this.isValidCache()) {
      return this.catalog;
    }

    await this.refreshCatalog();
    return this.catalog!;
  }

  /**
   * Get filtered list of stories based on criteria
   */
  async getFilteredStories(filters: StoryFilters): Promise<StoryMetadataWithAvailability[]> {
    const catalog = await this.getStoryCatalog();
    
    return catalog.stories.filter(story => {
      if (filters.difficulty && story.difficulty !== filters.difficulty) {
        return false;
      }
      
      if (filters.tags && !filters.tags.some(tag => story.tags.includes(tag))) {
        return false;
      }
      
      if (filters.maxLength && story.estimatedLength > filters.maxLength) {
        return false;
      }
      
      if (filters.minRating && (!story.rating || story.rating < filters.minRating)) {
        return false;
      }
      
      if (filters.language && story.language !== filters.language) {
        return false;
      }
      
      if (filters.author && story.author !== filters.author) {
        return false;
      }
      
      return story.available && story.validationStatus === 'valid';
    });
  }

  /**
   * Get metadata for a specific story by ID
   */
  async getStoryMetadata(storyId: string): Promise<StoryMetadataWithAvailability | null> {
    const catalog = await this.getStoryCatalog();
    return catalog.stories.find(story => story.id === storyId) || null;
  }

  /**
   * Validate that a story exists and is playable
   */
  async isStoryAvailable(storyId: string): Promise<boolean> {
    const metadata = await this.getStoryMetadata(storyId);
    return metadata?.available && metadata.validationStatus === 'valid' || false;
  }

  /**
   * Get story file path for loading full content
   */
  async getStoryFilePath(storyId: string): Promise<string | null> {
    const metadata = await this.getStoryMetadata(storyId);
    return metadata?.filePath || null;
  }

  /**
   * Load and validate a complete story file
   * Only use this when actually starting a game session
   */
  async loadFullStory(storyId: string): Promise<ByteboundGame | null> {
    // Check cache first
    if (this.storyCache.has(storyId)) {
      return this.storyCache.get(storyId)!;
    }

    const filePath = await this.getStoryFilePath(storyId);
    if (!filePath) {
      throw new Error(`Story not found: ${storyId}`);
    }

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const storyData = JSON.parse(fileContent);
      
      // Validate using universal schema
      const validatedStory = validateByteboundGame(storyData);
      
      // Cache the validated story
      if (this.config.enableCaching) {
        this.storyCache.set(storyId, validatedStory);
        
        // Set cache expiration
        setTimeout(() => {
          this.storyCache.delete(storyId);
        }, this.config.cacheExpiryMinutes * 60 * 1000);
      }
      
      return validatedStory;
    } catch (error) {
      throw new Error(`Failed to load story ${storyId}: ${error}`);
    }
  }

  /**
   * Refresh the story catalog by scanning the stories directory
   */
  private async refreshCatalog(): Promise<void> {
    try {
      const stories: StoryMetadataWithAvailability[] = [];
      const files = await readdir(this.config.storiesDirectory);
      
      for (const fileName of files) {
        if (extname(fileName) !== '.json' || fileName === 'metadata.json') {
          continue; // Skip non-JSON files and catalog file
        }
        
        const filePath = join(this.config.storiesDirectory, fileName);
        const fileStats = await stat(filePath);
        
        try {
          const storyMetadata = await this.extractStoryMetadata(filePath, fileStats);
          if (storyMetadata) {
            stories.push(storyMetadata);
          }
        } catch (error) {
          console.warn(`Failed to process story file ${fileName}:`, error);
          
          // Add invalid story to catalog with error info
          stories.push({
            id: fileName.replace('.json', ''),
            title: `Invalid Story: ${fileName}`,
            description: 'Story file could not be processed',
            author: 'Unknown',
            version: '0.0.0',
            difficulty: 'easy',
            estimatedLength: 0,
            tags: ['invalid'],
            language: 'en',
            createdAt: fileStats.birthtime,
            updatedAt: fileStats.mtime,
            publicationStatus: 'draft',
            available: false,
            filePath,
            fileSize: fileStats.size,
            lastModified: fileStats.mtime,
            validationStatus: 'invalid',
            validationErrors: [error instanceof Error ? error.message : String(error)]
          });
        }
      }
      
      this.catalog = {
        stories,
        totalCount: stories.length,
        lastUpdated: new Date(),
        catalogVersion: '1.0.0'
      };
      
      this.lastCatalogUpdate = new Date();
      
      // Store catalog in database for persistence
      if (this.config.database) {
        await this.config.database.storeStoryCatalog(this.catalog);
      }
      
    } catch (error) {
      throw new Error(`Failed to refresh story catalog: ${error}`);
    }
  }

  /**
   * Extract metadata from a story file without loading full content
   */
  private async extractStoryMetadata(
    filePath: string, 
    fileStats: { size: number; mtime: Date; birthtime: Date }
  ): Promise<StoryMetadataWithAvailability | null> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const storyData = JSON.parse(fileContent);
      
      // Basic validation to ensure it's a Bytebound game
      if (!storyData.metadata || !storyData.metadata.id) {
        throw new Error('Invalid story format: missing metadata or ID');
      }
      
      let validationStatus: 'valid' | 'invalid' | 'unknown' = 'unknown';
      let validationErrors: string[] = [];
      
      // Auto-validate if enabled
      if (this.config.autoValidateStories) {
        const cacheKey = `${filePath}:${fileStats.mtime.getTime()}`;
        let validationResult = this.validationCache.get(cacheKey);
        
        if (!validationResult || this.isValidationCacheExpired(validationResult.timestamp)) {
          try {
            validateByteboundGame(storyData);
            validationResult = { valid: true, errors: [], timestamp: new Date() };
          } catch (error) {
            validationResult = { 
              valid: false, 
              errors: [error instanceof Error ? error.message : String(error)], 
              timestamp: new Date() 
            };
          }
          
          this.validationCache.set(cacheKey, validationResult);
        }
        
        validationStatus = validationResult.valid ? 'valid' : 'invalid';
        validationErrors = validationResult.errors;
      }
      
      const metadata = storyData.metadata;
      
      return {
        id: metadata.id,
        title: metadata.title || 'Untitled Story',
        description: metadata.description || 'No description available',
        author: metadata.author || 'Unknown Author',
        version: metadata.version || '1.0.0',
        difficulty: metadata.difficulty || 'easy',
        estimatedLength: metadata.estimatedLength || 60,
        tags: metadata.tags || [],
        contentWarnings: metadata.contentWarnings,
        minAge: metadata.minAge,
        language: metadata.language || 'en',
        createdAt: metadata.createdAt ? new Date(metadata.createdAt) : fileStats.birthtime,
        updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt) : fileStats.mtime,
        publicationStatus: metadata.publicationStatus || 'published',
        rating: metadata.rating,
        playCount: metadata.playCount,
        available: validationStatus !== 'invalid',
        filePath,
        fileSize: fileStats.size,
        lastModified: fileStats.mtime,
        validationStatus,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };
    } catch (error) {
      throw new Error(`Failed to extract metadata from ${filePath}: ${error}`);
    }
  }

  /**
   * Check if catalog cache is still valid
   */
  private isValidCache(): boolean {
    if (!this.lastCatalogUpdate) return false;
    
    const expiryTime = this.config.cacheExpiryMinutes * 60 * 1000;
    return (Date.now() - this.lastCatalogUpdate.getTime()) < expiryTime;
  }

  /**
   * Check if validation cache entry is expired
   */
  private isValidationCacheExpired(timestamp: Date): boolean {
    const expiryTime = this.config.cacheExpiryMinutes * 60 * 1000;
    return (Date.now() - timestamp.getTime()) > expiryTime;
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    this.catalog = null;
    this.lastCatalogUpdate = null;
    this.storyCache.clear();
    this.validationCache.clear();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      catalogStories: this.catalog?.totalCount || 0,
      cachedStories: this.storyCache.size,
      validationCacheSize: this.validationCache.size,
      lastCatalogUpdate: this.lastCatalogUpdate,
      cacheEnabled: this.config.enableCaching
    };
  }
}