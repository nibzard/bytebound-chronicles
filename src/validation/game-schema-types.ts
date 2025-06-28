/**
 * TypeScript types generated from the Bytebound Chronicles Universal Game Schema
 * These types provide compile-time validation and IDE support for game development
 */

export type GameStyle = 
  | "rpg-fantasy"
  | "horror-survival"
  | "heist-crime"
  | "romance-dating"
  | "sci-fi-exploration"
  | "time-loop-mystery"
  | "thriller-investigation"
  | "comedy-adventure"
  | "historical-drama"
  | "custom";

export type Difficulty = "easy" | "normal" | "hard" | "expert";

export type ContentTag = 
  | "mystery" | "fantasy" | "horror" | "romance" | "sci-fi" | "crime"
  | "thriller" | "comedy" | "historical" | "psychological" | "supernatural"
  | "investigation" | "combat" | "stealth" | "social" | "strategy"
  | "survival" | "exploration" | "time-travel" | "magic";

export type PlayerInputMode = "freeText" | "quickActions" | "hybrid";

export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  author?: string;
  version: string;
  gameStyle: GameStyle;
  difficulty?: Difficulty;
  estimatedLength?: number;
  tags?: ContentTag[];
  contentWarnings?: string[];
  playerInputMode?: {
    primary?: PlayerInputMode;
    quickActionsEnabled?: boolean;
    customActionAlwaysAvailable?: boolean;
  };
}

export interface HiddenMechanics {
  playerStats: Record<string, number>;
  thresholds?: Record<string, number>;
  relationships?: Record<string, number>;
  gameSpecificMechanics?: Record<string, any>;
  environmentalEffects?: Record<string, {
    statModifiers?: Record<string, number>;
    duration?: number;
    description?: string;
  }>;
  difficultyModifiers?: {
    easy?: DifficultySettings;
    normal?: DifficultySettings;
    hard?: DifficultySettings;
    expert?: DifficultySettings;
  };
}

export interface DifficultySettings {
  statMultipliers?: Record<string, number>;
  skillCheckBonus?: number;
  resourceModifier?: number;
}

export type RequirementType = "stat" | "item" | "objective" | "choice" | "character" | "beat" | "flag";
export type ComparisonOperator = ">=" | "<=" | ">" | "<" | "==" | "!=";

export interface Requirement {
  type?: RequirementType;
  condition?: string;
  value?: string | number | boolean;
  operator?: ComparisonOperator;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  visible?: boolean;
  enabled?: boolean;
  requirements?: Requirement[];
  effects?: {
    statChanges?: Record<string, number>;
    narrative?: string;
    progressStory?: boolean;
    revealsAction?: string;
    unlocksPath?: string;
    addsItem?: string;
    removesItem?: string;
    triggersEvent?: string;
  };
  cooldown?: number;
  oneTimeUse?: boolean;
}

export type ObjectiveType = "required" | "optional" | "hidden" | "bonus";

export interface Objective {
  id: string;
  description: string;
  type?: ObjectiveType;
  visible?: boolean;
  completionHints?: string[];
  weight?: number;
  timeLimit?: number;
  rewards?: {
    experience?: number;
    statBonus?: Record<string, number>;
    items?: string[];
  };
}

export type EncounterType = "random" | "conditional" | "triggered" | "combat" | "social" | "puzzle";

export interface Encounter {
  id: string;
  type: EncounterType;
  chance?: number;
  trigger?: Requirement;
  description?: string;
  quickActions?: QuickAction[];
  outcomes?: Array<{
    condition?: Requirement;
    narrative?: string;
    effects?: Record<string, any>;
  }>;
}

export interface HiddenTrigger {
  condition?: Requirement;
  effect?: string;
  description?: string;
  narrative?: string;
  oneTime?: boolean;
}

export interface SkillCheck {
  trigger?: string;
  stat?: string;
  difficulty?: number;
  successText?: string;
  failureText?: string;
  criticalSuccess?: {
    threshold?: number;
    text?: string;
    effects?: Record<string, any>;
  };
  criticalFailure?: {
    threshold?: number;
    text?: string;
    effects?: Record<string, any>;
  };
}

export interface ExitCondition {
  requirements?: Requirement[];
  nextBeat?: string;
  narrative?: string;
  automatic?: boolean;
}

export type TimeOfDay = "dawn" | "morning" | "midday" | "afternoon" | "evening" | "night" | "midnight" | "any";

export interface StoryBeat {
  id: string;
  act?: number;
  title: string;
  description: string;
  setting?: {
    location?: string;
    timeOfDay?: TimeOfDay;
    weather?: string;
    atmosphere?: string;
    lighting?: string;
  };
  entryRequirements?: Requirement[];
  narrativeGuidance?: {
    openingText?: string;
    dynamicElements?: Record<string, string>;
    moodProgression?: string[];
  };
  quickActions?: QuickAction[];
  objectives?: Objective[];
  encounters?: Encounter[];
  hiddenTriggers?: HiddenTrigger[];
  skillChecks?: SkillCheck[];
  exitConditions?: ExitCondition[];
}

export type CharacterRole = 
  | "ally" | "enemy" | "neutral" | "vendor" | "informant"
  | "love_interest" | "mentor" | "rival" | "victim" | "suspect" | "witness";

export interface DialogueNode {
  text?: string;
  conditions?: Requirement[];
  playerOptions?: Array<{
    text?: string;
    requirements?: Requirement[];
    effects?: Record<string, any>;
    leadsTo?: string;
  }>;
  reveals?: string[];
}

export type CompanionAbilityType = "active" | "passive" | "combat" | "social" | "exploration";
export type CooldownType = "per_beat" | "per_act" | "per_game" | "none";

export interface CompanionAbility {
  id?: string;
  name?: string;
  description?: string;
  type?: CompanionAbilityType;
  cooldown?: CooldownType;
  requirements?: Requirement[];
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  personality?: string[];
  role?: CharacterRole;
  stats?: Record<string, number>;
  relationships?: Record<string, string>;
  knowledge?: string[];
  secrets?: string[];
  dialogueTrees?: Record<string, DialogueNode>;
  companionAbilities?: CompanionAbility[];
  schedule?: Record<string, string>;
}

export type ItemType = 
  | "tool" | "weapon" | "armor" | "consumable" | "quest_item"
  | "clue" | "key" | "document" | "currency" | "material";

export type ItemProperty = 
  | "readable" | "usable" | "equippable" | "stackable" | "tradeable"
  | "valuable" | "evidence" | "magical" | "technological" | "perishable";

export interface Item {
  id: string;
  name: string;
  description?: string;
  type?: ItemType;
  properties?: ItemProperty[];
  effects?: {
    statModifiers?: Record<string, number>;
    narrative?: string;
    revealsInformation?: string[];
    unlocksPath?: string;
  };
  requirements?: Requirement[];
  uses?: number;
  combatProperties?: {
    damage?: string;
    defense?: number;
    range?: "melee" | "short" | "medium" | "long";
    special?: string[];
  };
  acquisitionMethod?: string;
}

export type EndingCategory = "good" | "neutral" | "bad" | "secret" | "true";

export interface Ending {
  id: string;
  title: string;
  description: string;
  category?: EndingCategory;
  requirements?: Requirement[];
  narrative?: string;
  consequences?: {
    worldState?: string;
    characterFates?: Record<string, string>;
    playerLegacy?: string;
  };
  rewards?: {
    experience?: number;
    items?: string[];
    achievements?: string[];
    unlocks?: string[];
  };
}

export interface AIGuidance {
  toneProgression: Record<string, string>;
  narrativeStyle?: {
    perspective?: "second-person" | "third-person" | "first-person";
    tense?: "present" | "past";
    descriptiveLevel?: "minimal" | "moderate" | "detailed" | "cinematic";
  };
  playerAgency?: string;
  mechanicsHandling?: string;
  responseToPlayerMood?: Record<string, string>;
  forbiddenTopics?: string[];
  encouragedElements?: string[];
}

export interface FunctionCall {
  name: string;
  description: string;
  parameters?: Record<string, string>;
  restrictions?: string[];
  examples?: Array<{
    situation?: string;
    call?: Record<string, any>;
  }>;
}

export interface GameSettings {
  saveSystem?: {
    autosaveEnabled?: boolean;
    checkpointBeats?: string[];
  };
  timeManagement?: {
    realTimeEvents?: boolean;
    timePressure?: boolean;
  };
}

export interface ByteboundGame {
  metadata: GameMetadata;
  hiddenMechanics: HiddenMechanics;
  beats: StoryBeat[];
  characters?: Character[];
  items?: Item[];
  endings?: Ending[];
  aiGuidance: AIGuidance;
  functionCalls: FunctionCall[];
  gameSettings?: GameSettings;
}

// Utility types for common patterns
export type StatBlock = Record<string, number>;
export type GameFlag = Record<string, boolean>;
export type InventoryItem = { id: string; quantity: number; };

// Type guards for runtime validation
export function isValidGameStyle(style: string): style is GameStyle {
  const validStyles: GameStyle[] = [
    "rpg-fantasy", "horror-survival", "heist-crime", "romance-dating",
    "sci-fi-exploration", "time-loop-mystery", "thriller-investigation",
    "comedy-adventure", "historical-drama", "custom"
  ];
  return validStyles.includes(style as GameStyle);
}

export function isValidDifficulty(difficulty: string): difficulty is Difficulty {
  return ["easy", "normal", "hard", "expert"].includes(difficulty);
}

export function isValidRequirementType(type: string): type is RequirementType {
  return ["stat", "item", "objective", "choice", "character", "beat", "flag"].includes(type);
}

// Helper functions for game development
export function createQuickAction(
  id: string,
  label: string,
  effects: QuickAction['effects'] = {}
): QuickAction {
  return {
    id,
    label,
    visible: true,
    enabled: true,
    effects
  };
}

export function createObjective(
  id: string,
  description: string,
  type: ObjectiveType = "required"
): Objective {
  return {
    id,
    description,
    type,
    visible: true,
    weight: 1
  };
}

export function createStatRequirement(
  stat: string,
  value: number,
  operator: ComparisonOperator = ">="
): Requirement {
  return {
    type: "stat",
    condition: stat,
    value,
    operator
  };
}

export function createItemRequirement(itemId: string): Requirement {
  return {
    type: "item",
    condition: itemId
  };
}

// Validation helpers
export class GameValidationError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = "GameValidationError";
  }
}

export function validateGameMetadata(metadata: GameMetadata): void {
  if (!metadata.id || !/^[a-z0-9-]+$/.test(metadata.id)) {
    throw new GameValidationError("Game ID must be kebab-case alphanumeric", "metadata.id");
  }
  
  if (!metadata.title || metadata.title.length === 0) {
    throw new GameValidationError("Game title is required", "metadata.title");
  }
  
  if (!metadata.version || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    throw new GameValidationError("Version must follow semantic versioning", "metadata.version");
  }
  
  if (!isValidGameStyle(metadata.gameStyle)) {
    throw new GameValidationError(`Invalid game style: ${metadata.gameStyle}`, "metadata.gameStyle");
  }
}

export function validateStoryBeat(beat: StoryBeat, index: number): void {
  if (!beat.id || !/^[a-z0-9_-]+$/.test(beat.id)) {
    throw new GameValidationError(`Beat ID must be lowercase alphanumeric with underscores/hyphens`, `beats[${index}].id`);
  }
  
  if (!beat.title || beat.title.length === 0) {
    throw new GameValidationError("Beat title is required", `beats[${index}].title`);
  }
  
  if (!beat.description || beat.description.length === 0) {
    throw new GameValidationError("Beat description is required", `beats[${index}].description`);
  }
}

export function validateGame(game: ByteboundGame): void {
  validateGameMetadata(game.metadata);
  
  if (!game.beats || game.beats.length === 0) {
    throw new GameValidationError("At least one story beat is required", "beats");
  }
  
  game.beats.forEach((beat, index) => validateStoryBeat(beat, index));
  
  if (!game.hiddenMechanics.playerStats || Object.keys(game.hiddenMechanics.playerStats).length === 0) {
    throw new GameValidationError("At least one player stat is required", "hiddenMechanics.playerStats");
  }
  
  if (!game.aiGuidance.toneProgression || Object.keys(game.aiGuidance.toneProgression).length === 0) {
    throw new GameValidationError("Tone progression guidance is required", "aiGuidance.toneProgression");
  }
}