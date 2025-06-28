/**
 * Zod schema validator for Bytebound Chronicles game files
 * Provides runtime validation with detailed error messages
 */

import { z } from 'zod';
import type { ByteboundGame } from './game-schema-types';

// Base validation schemas
const gameStyleSchema = z.enum([
  "rpg-fantasy", "horror-survival", "heist-crime", "romance-dating",
  "sci-fi-exploration", "time-loop-mystery", "thriller-investigation",
  "comedy-adventure", "historical-drama", "custom"
]);

const difficultySchema = z.enum(["easy", "normal", "hard", "expert"]);

const contentTagSchema = z.enum([
  "mystery", "fantasy", "horror", "romance", "sci-fi", "crime",
  "thriller", "comedy", "historical", "psychological", "supernatural",
  "investigation", "combat", "stealth", "social", "strategy",
  "survival", "exploration", "time-travel", "magic"
]);

const playerInputModeSchema = z.enum(["freeText", "quickActions", "hybrid"]);

const timeOfDaySchema = z.enum([
  "dawn", "morning", "midday", "afternoon", "evening", "night", "midnight", "any"
]);

const requirementTypeSchema = z.enum([
  "stat", "item", "objective", "choice", "character", "beat", "flag"
]);

const comparisonOperatorSchema = z.enum([">=", "<=", ">", "<", "==", "!="]);

// Complex validation schemas
const requirementSchema = z.object({
  type: requirementTypeSchema.optional(),
  condition: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  operator: comparisonOperatorSchema.optional().default(">=")
});

const quickActionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Quick action ID must be lowercase alphanumeric with underscores/hyphens"),
  label: z.string().min(1, "Quick action label is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  visible: z.boolean().optional().default(true),
  enabled: z.boolean().optional().default(true),
  requirements: z.array(requirementSchema).optional(),
  effects: z.object({
    statChanges: z.record(z.string(), z.number()).optional(),
    narrative: z.string().optional(),
    progressStory: z.boolean().optional(),
    revealsAction: z.string().optional(),
    unlocksPath: z.string().optional(),
    addsItem: z.string().optional(),
    removesItem: z.string().optional(),
    triggersEvent: z.string().optional()
  }).optional(),
  cooldown: z.number().min(0).optional(),
  oneTimeUse: z.boolean().optional().default(false)
});

const objectiveSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Objective ID must be lowercase alphanumeric with underscores/hyphens"),
  description: z.string().min(1, "Objective description is required"),
  type: z.enum(["required", "optional", "hidden", "bonus"]).optional().default("required"),
  visible: z.boolean().optional().default(true),
  completionHints: z.array(z.string()).optional(),
  weight: z.number().min(1).max(10).optional().default(1),
  timeLimit: z.number().optional(),
  rewards: z.object({
    experience: z.number().optional(),
    statBonus: z.record(z.string(), z.number()).optional(),
    items: z.array(z.string()).optional()
  }).optional()
});

const encounterSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Encounter ID must be lowercase alphanumeric with underscores/hyphens"),
  type: z.enum(["random", "conditional", "triggered", "combat", "social", "puzzle"]),
  chance: z.number().min(0).max(1).optional(),
  trigger: requirementSchema.optional(),
  description: z.string().optional(),
  quickActions: z.array(quickActionSchema).optional(),
  outcomes: z.array(z.object({
    condition: requirementSchema.optional(),
    narrative: z.string().optional(),
    effects: z.record(z.string(), z.any()).optional()
  })).optional()
});

const hiddenTriggerSchema = z.object({
  condition: requirementSchema.optional(),
  effect: z.string().optional(),
  description: z.string().optional(),
  narrative: z.string().optional(),
  oneTime: z.boolean().optional().default(true)
});

const skillCheckSchema = z.object({
  trigger: z.string().optional(),
  stat: z.string().optional(),
  difficulty: z.number().min(1).max(30).optional(),
  successText: z.string().optional(),
  failureText: z.string().optional(),
  criticalSuccess: z.object({
    threshold: z.number().optional(),
    text: z.string().optional(),
    effects: z.record(z.string(), z.any()).optional()
  }).optional(),
  criticalFailure: z.object({
    threshold: z.number().optional(),
    text: z.string().optional(),
    effects: z.record(z.string(), z.any()).optional()
  }).optional()
});

const exitConditionSchema = z.object({
  requirements: z.array(requirementSchema).optional(),
  nextBeat: z.string().optional(),
  narrative: z.string().optional(),
  automatic: z.boolean().optional().default(false)
});

const storyBeatSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Beat ID must be lowercase alphanumeric with underscores/hyphens"),
  act: z.number().min(1).optional(),
  title: z.string().min(1, "Beat title is required"),
  description: z.string().min(1, "Beat description is required"),
  setting: z.object({
    location: z.string().optional(),
    timeOfDay: timeOfDaySchema.optional(),
    weather: z.string().optional(),
    atmosphere: z.string().optional(),
    lighting: z.string().optional()
  }).optional(),
  entryRequirements: z.array(requirementSchema).optional(),
  narrativeGuidance: z.object({
    openingText: z.string().optional(),
    dynamicElements: z.record(z.string(), z.string()).optional(),
    moodProgression: z.array(z.string()).optional()
  }).optional(),
  quickActions: z.array(quickActionSchema).optional(),
  objectives: z.array(objectiveSchema).optional(),
  encounters: z.array(encounterSchema).optional(),
  hiddenTriggers: z.array(hiddenTriggerSchema).optional(),
  skillChecks: z.array(skillCheckSchema).optional(),
  exitConditions: z.array(exitConditionSchema).optional()
});

const dialogueNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
  text: z.string().optional(),
  conditions: z.array(requirementSchema).optional(),
  playerOptions: z.array(z.object({
    text: z.string().optional(),
    requirements: z.array(requirementSchema).optional(),
    effects: z.record(z.string(), z.any()).optional(),
    leadsTo: z.string().optional()
  })).optional(),
  reveals: z.array(z.string()).optional()
}));

const companionAbilitySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["active", "passive", "combat", "social", "exploration"]).optional(),
  cooldown: z.enum(["per_beat", "per_act", "per_game", "none"]).optional(),
  requirements: z.array(requirementSchema).optional()
});

const characterSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Character ID must be lowercase alphanumeric with underscores/hyphens"),
  name: z.string().min(1, "Character name is required"),
  description: z.string().optional(),
  personality: z.array(z.string()).optional(),
  role: z.enum([
    "ally", "enemy", "neutral", "vendor", "informant",
    "love_interest", "mentor", "rival", "victim", "suspect", "witness"
  ]).optional(),
  stats: z.record(z.string(), z.number()).optional(),
  relationships: z.record(z.string(), z.string()).optional(),
  knowledge: z.array(z.string()).optional(),
  secrets: z.array(z.string()).optional(),
  dialogueTrees: z.record(z.string(), dialogueNodeSchema).optional(),
  companionAbilities: z.array(companionAbilitySchema).optional(),
  schedule: z.record(z.string(), z.string()).optional()
});

const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Item ID must be lowercase alphanumeric with underscores/hyphens"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  type: z.enum([
    "tool", "weapon", "armor", "consumable", "quest_item",
    "clue", "key", "document", "currency", "material"
  ]).optional(),
  properties: z.array(z.enum([
    "readable", "usable", "equippable", "stackable", "tradeable",
    "valuable", "evidence", "magical", "technological", "perishable"
  ])).optional(),
  effects: z.object({
    statModifiers: z.record(z.string(), z.number()).optional(),
    narrative: z.string().optional(),
    revealsInformation: z.array(z.string()).optional(),
    unlocksPath: z.string().optional()
  }).optional(),
  requirements: z.array(requirementSchema).optional(),
  uses: z.number().min(1).optional(),
  combatProperties: z.object({
    damage: z.string().regex(/^\d*d\d+(\+\d+)?$/, "Damage must be in dice notation format").optional(),
    defense: z.number().optional(),
    range: z.enum(["melee", "short", "medium", "long"]).optional(),
    special: z.array(z.string()).optional()
  }).optional(),
  acquisitionMethod: z.string().optional()
});

const endingSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "Ending ID must be lowercase alphanumeric with underscores/hyphens"),
  title: z.string().min(1, "Ending title is required"),
  description: z.string().min(1, "Ending description is required"),
  category: z.enum(["good", "neutral", "bad", "secret", "true"]).optional(),
  requirements: z.array(requirementSchema).optional(),
  narrative: z.string().optional(),
  consequences: z.object({
    worldState: z.string().optional(),
    characterFates: z.record(z.string(), z.string()).optional(),
    playerLegacy: z.string().optional()
  }).optional(),
  rewards: z.object({
    experience: z.number().optional(),
    items: z.array(z.string()).optional(),
    achievements: z.array(z.string()).optional(),
    unlocks: z.array(z.string()).optional()
  }).optional()
});

const functionCallSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Function name must be valid identifier"),
  description: z.string().min(1, "Function description is required"),
  parameters: z.record(z.string(), z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  examples: z.array(z.object({
    situation: z.string().optional(),
    call: z.record(z.string(), z.any()).optional()
  })).optional()
});

const difficultySettingsSchema = z.object({
  statMultipliers: z.record(z.string(), z.number().min(0.1).max(10.0)).optional(),
  skillCheckBonus: z.number().optional(),
  resourceModifier: z.number().optional()
});

// Main game schema
const byteboundGameSchema = z.object({
  metadata: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, "Game ID must be kebab-case alphanumeric"),
    title: z.string().min(1).max(100, "Title must be 1-100 characters"),
    description: z.string().min(1).max(500, "Description must be 1-500 characters"),
    author: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must follow semantic versioning"),
    gameStyle: gameStyleSchema,
    difficulty: difficultySchema.optional().default("normal"),
    estimatedLength: z.number().min(15).max(1200).optional(),
    tags: z.array(contentTagSchema).max(8).optional(),
    contentWarnings: z.array(z.string()).optional(),
    playerInputMode: z.object({
      primary: playerInputModeSchema.optional().default("hybrid"),
      quickActionsEnabled: z.boolean().optional().default(true),
      customActionAlwaysAvailable: z.boolean().optional().default(true)
    }).optional()
  }),
  
  hiddenMechanics: z.object({
    playerStats: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.number())
      .refine(stats => Object.keys(stats).length > 0, "At least one player stat is required"),
    thresholds: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.number()).optional(),
    relationships: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.number().min(-100).max(100)).optional(),
    gameSpecificMechanics: z.record(z.string(), z.any()).optional(),
    environmentalEffects: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.object({
      statModifiers: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.number()).optional(),
      duration: z.number().optional(),
      description: z.string().optional()
    })).optional(),
    difficultyModifiers: z.object({
      easy: difficultySettingsSchema.optional(),
      normal: difficultySettingsSchema.optional(),
      hard: difficultySettingsSchema.optional(),
      expert: difficultySettingsSchema.optional()
    }).optional()
  }),
  
  beats: z.array(storyBeatSchema).min(1, "At least one story beat is required"),
  characters: z.array(characterSchema).optional(),
  items: z.array(itemSchema).optional(),
  endings: z.array(endingSchema).optional(),
  
  aiGuidance: z.object({
    toneProgression: z.record(
      z.string().regex(/^(act[1-9]|act[1-9][0-9]|beginning|middle|end|climax)$/),
      z.string()
    ).refine(progression => Object.keys(progression).length > 0, "Tone progression is required"),
    narrativeStyle: z.object({
      perspective: z.enum(["second-person", "third-person", "first-person"]).optional().default("second-person"),
      tense: z.enum(["present", "past"]).optional().default("present"),
      descriptiveLevel: z.enum(["minimal", "moderate", "detailed", "cinematic"]).optional().default("moderate")
    }).optional(),
    playerAgency: z.string().optional(),
    mechanicsHandling: z.string().optional(),
    responseToPlayerMood: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.string()).optional(),
    forbiddenTopics: z.array(z.string()).optional(),
    encouragedElements: z.array(z.string()).optional()
  }),
  
  functionCalls: z.array(functionCallSchema),
  
  gameSettings: z.object({
    saveSystem: z.object({
      autosaveEnabled: z.boolean().optional().default(true),
      checkpointBeats: z.array(z.string()).optional()
    }).optional(),
    timeManagement: z.object({
      realTimeEvents: z.boolean().optional().default(false),
      timePressure: z.boolean().optional().default(false)
    }).optional()
  }).optional()
});

// Validation functions
export function validateByteboundGame(data: unknown): ByteboundGame {
  try {
    return byteboundGameSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Game validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

export function validateGameSafely(data: unknown): {
  success: boolean;
  data?: ByteboundGame;
  errors?: string[];
} {
  try {
    const validatedGame = validateByteboundGame(data);
    return { success: true, data: validatedGame };
  } catch (error) {
    if (error instanceof Error) {
      return { 
        success: false, 
        errors: error.message.split('\n').filter(line => line.trim().length > 0)
      };
    }
    return { 
      success: false, 
      errors: ['Unknown validation error occurred']
    };
  }
}

// Additional validation utilities
export function validateGameIds(game: ByteboundGame): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  
  // Check for duplicate beat IDs
  game.beats.forEach((beat, index) => {
    if (seenIds.has(beat.id)) {
      errors.push(`Duplicate beat ID: ${beat.id} (at index ${index})`);
    }
    seenIds.add(beat.id);
  });
  
  // Check for duplicate character IDs
  if (game.characters) {
    const characterIds = new Set<string>();
    game.characters.forEach((character, index) => {
      if (characterIds.has(character.id)) {
        errors.push(`Duplicate character ID: ${character.id} (at index ${index})`);
      }
      characterIds.add(character.id);
    });
  }
  
  // Check for duplicate item IDs
  if (game.items) {
    const itemIds = new Set<string>();
    game.items.forEach((item, index) => {
      if (itemIds.has(item.id)) {
        errors.push(`Duplicate item ID: ${item.id} (at index ${index})`);
      }
      itemIds.add(item.id);
    });
  }
  
  return errors;
}

export function validateGameReferences(game: ByteboundGame): string[] {
  const errors: string[] = [];
  
  const beatIds = new Set(game.beats.map(b => b.id));
  const characterIds = new Set(game.characters?.map(c => c.id) || []);
  const itemIds = new Set(game.items?.map(i => i.id) || []);
  
  // Check beat exit conditions reference valid beats
  game.beats.forEach((beat, beatIndex) => {
    beat.exitConditions?.forEach((exit, exitIndex) => {
      if (exit.nextBeat && !beatIds.has(exit.nextBeat)) {
        errors.push(`Beat ${beat.id} exit condition ${exitIndex} references non-existent beat: ${exit.nextBeat}`);
      }
    });
    
    // Check quick actions reference valid items
    beat.quickActions?.forEach((action, actionIndex) => {
      if (action.effects?.addsItem && !itemIds.has(action.effects.addsItem)) {
        errors.push(`Beat ${beat.id} action ${action.id} references non-existent item: ${action.effects.addsItem}`);
      }
      if (action.effects?.removesItem && !itemIds.has(action.effects.removesItem)) {
        errors.push(`Beat ${beat.id} action ${action.id} references non-existent item: ${action.effects.removesItem}`);
      }
    });
  });
  
  return errors;
}

export function validateCompleteGame(data: unknown): {
  success: boolean;
  data?: ByteboundGame;
  errors?: string[];
} {
  const schemaValidation = validateGameSafely(data);
  if (!schemaValidation.success || !schemaValidation.data) {
    return schemaValidation;
  }
  
  const game = schemaValidation.data;
  const idErrors = validateGameIds(game);
  const referenceErrors = validateGameReferences(game);
  
  const allErrors = [...(schemaValidation.errors || []), ...idErrors, ...referenceErrors];
  
  if (allErrors.length > 0) {
    return { success: false, errors: allErrors };
  }
  
  return { success: true, data: game };
}

// Export the Zod schema for advanced use cases
export { byteboundGameSchema };