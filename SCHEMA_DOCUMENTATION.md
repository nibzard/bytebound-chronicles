# Bytebound Chronicles Universal Game Schema Documentation

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Schema Structure](#schema-structure)
4. [Game Styles](#game-styles)
5. [Core Components](#core-components)
6. [Validation](#validation)
7. [Examples](#examples)
8. [Best Practices](#best-practices)
9. [Migration Guide](#migration-guide)

## Overview

The Bytebound Chronicles Universal Game Schema is a comprehensive JSON schema designed to define narrative adventure games with hidden mechanics and AI-driven storytelling. It supports multiple genres while maintaining a consistent structure that enables the AI engine to create dynamic, personalized experiences.

### Key Features

- **Universal Design**: One schema supports all game styles from RPG to horror to heist
- **Hidden Mechanics**: Invisible stat tracking that affects narrative naturally
- **AI Integration**: Built-in guidance for consistent AI behavior
- **Player Agency**: Always supports both quick actions and free-text input
- **Progressive Revelation**: Content unlocks based on player choices and stats
- **Validation**: Comprehensive TypeScript types and runtime validation

### Inspiration

This schema incorporates design principles from legendary game designers:

- **John Romero**: Player agency, emergent gameplay, systems interaction
- **Sid Meier**: Meaningful choices, interesting decisions, progressive engagement
- **Ron Gilbert**: Story-driven design, character focus, player investment

## Design Philosophy

### Core Principles

1. **Story First**: Mechanics serve narrative, never the other way around
2. **Hidden Complexity**: Rich systems work invisibly behind natural language
3. **Player Freedom**: Every situation offers both guided and creative solutions
4. **Meaningful Choices**: Decisions have clear consequences that matter
5. **AI Partnership**: Schema guides AI to create consistent, engaging experiences

### The "Goldfish Test"

Players should never need to remember numbers or complex mechanics. The game feels natural because the AI handles complexity invisibly, presenting only narrative consequences.

### Emergent Storytelling

The combination of hidden stats, player choices, and AI interpretation creates unique stories that feel personal and responsive while maintaining narrative coherence.

## Schema Structure

### Required Components

Every Bytebound Chronicles game requires:

```json
{
  "metadata": { /* Game info and settings */ },
  "hiddenMechanics": { /* Invisible stats and thresholds */ },
  "beats": [ /* Story progression beats */ ],
  "aiGuidance": { /* Instructions for AI behavior */ },
  "functionCalls": [ /* Available AI functions */ ]
}
```

### Optional Components

Additional components for richer experiences:

```json
{
  "characters": [ /* NPCs with personalities and dialogue */ ],
  "items": [ /* Tools, clues, and equipment */ ],
  "endings": [ /* Multiple conclusion paths */ ],
  "gameSettings": { /* Save system and time management */ }
}
```

## Game Styles

The schema supports multiple game styles, each with specific conventions:

### RPG-Fantasy
- **Stats**: health, stamina, strength, intelligence, charisma, agility
- **Focus**: Character development, exploration, combat
- **Example**: `examples/rpg-merchants-mystery.json`

### Horror-Survival
- **Stats**: sanity, fear, resources, body_temperature
- **Focus**: Psychological pressure, resource management, atmospheric dread
- **Example**: `examples/horror-arctic-station.json`

### Heist-Crime
- **Stats**: heat, planning, resources, crew_loyalty, intel
- **Focus**: Strategic planning, team dynamics, risk vs. reward
- **Example**: `examples/heist-venetian-carnival.json`

### Time-Loop-Mystery
- **Stats**: loop_knowledge, timeline_stability, sanity, clues_discovered
- **Focus**: Accumulated knowledge, investigation, reality manipulation
- **Example**: `examples/timeloop-tuesday-mystery.json`

### Romance-Dating
- **Stats**: confidence, charisma, relationship scores per character
- **Focus**: Social interaction, emotional development, multiple paths

### Sci-Fi-Exploration
- **Stats**: ship_integrity, crew_morale, fuel, scientific_data, diplomatic_standing
- **Focus**: Discovery, technology, first contact scenarios

## Core Components

### Metadata

Defines basic game information:

```json
{
  "metadata": {
    "id": "my-game",
    "title": "My Adventure",
    "description": "An exciting story...",
    "version": "1.0.0",
    "gameStyle": "rpg-fantasy",
    "difficulty": "normal",
    "tags": ["mystery", "fantasy"],
    "contentWarnings": ["mild violence"]
  }
}
```

#### Key Fields

- `id`: Unique identifier (kebab-case)
- `gameStyle`: One of the supported styles
- `difficulty`: Affects stat multipliers and skill checks
- `tags`: Used for categorization and discovery

### Hidden Mechanics

The invisible engine that drives narrative adaptation:

```json
{
  "hiddenMechanics": {
    "playerStats": {
      "health": 100,
      "courage": 50,
      "knowledge": 0
    },
    "thresholds": {
      "lowHealth": 30,
      "highCourage": 80
    },
    "relationships": {
      "village_elder": 0,
      "tavern_keeper": 0
    }
  }
}
```

#### Stat Design Guidelines

1. **Meaningful**: Each stat should affect narrative in clear ways
2. **Balanced**: Starting values should allow for both growth and decline
3. **Themed**: Stats should fit the game's genre and tone
4. **Limited**: 5-8 core stats maximum to avoid complexity

#### Thresholds

Define breakpoints where narrative changes:

```json
{
  "thresholds": {
    "lowHealth": 30,      // Descriptions mention fatigue, pain
    "heroicReputation": 80, // NPCs treat player as legendary
    "brokenTrust": -20     // Village becomes hostile
  }
}
```

### Story Beats

The building blocks of narrative progression:

```json
{
  "beats": [
    {
      "id": "village_arrival",
      "title": "Arrival at Millhaven",
      "description": "You arrive at the village...",
      "setting": {
        "location": "village_entrance",
        "timeOfDay": "evening",
        "atmosphere": "tense, foreboding"
      },
      "quickActions": [ /* Available player actions */ ],
      "objectives": [ /* Player goals */ ]
    }
  ]
}
```

#### Beat Components

- **Setting**: Physical and emotional context
- **Narrative Guidance**: Instructions for AI presentation
- **Quick Actions**: Contextual player options
- **Objectives**: Clear goals for progression
- **Hidden Triggers**: Invisible events based on stats

### Quick Actions

Player options that adapt to stats and story state:

```json
{
  "quickActions": [
    {
      "id": "approach_calmly",
      "label": "Enter the village peacefully",
      "description": "Walk in with non-threatening demeanor",
      "icon": "🚶",
      "visible": true,
      "requirements": [
        {
          "type": "stat",
          "condition": "reputation",
          "value": -50,
          "operator": ">="
        }
      ],
      "effects": {
        "statChanges": {
          "trust": 10,
          "reputation": 5
        },
        "narrative": "gentle_approach"
      }
    }
  ]
}
```

#### Action Design

1. **Clear Labels**: Players should understand what the action does
2. **Meaningful Effects**: Every action should have narrative consequences
3. **Conditional Visibility**: Actions appear based on player state
4. **Alternative Paths**: Multiple approaches to every situation

### Characters

NPCs with personality, knowledge, and relationships:

```json
{
  "characters": [
    {
      "id": "village_elder",
      "name": "Elder Thomsen",
      "description": "A weathered man with knowing eyes",
      "personality": ["wise", "secretive", "protective"],
      "role": "informant",
      "knowledge": ["village_history", "ancient_secrets"],
      "dialogueTrees": {
        "initial_meeting": {
          "text": "Storm's coming, stranger...",
          "playerOptions": [
            {
              "text": "Tell me about the merchant",
              "effects": { "statChanges": { "knowledge": 1 } },
              "leadsTo": "merchant_info"
            }
          ]
        }
      }
    }
  ]
}
```

#### Character Development

- **Personality**: 3-5 key traits that guide behavior
- **Knowledge**: What they know about the world
- **Secrets**: Information they might reveal under conditions
- **Dialogue Trees**: Branching conversations with stat effects

### Items

Objects that provide gameplay options and narrative depth:

```json
{
  "items": [
    {
      "id": "merchants_ledger",
      "name": "Garrett's Ledger",
      "description": "A journal filled with increasingly frantic notes",
      "type": "quest_item",
      "properties": ["readable", "evidence"],
      "effects": {
        "revealsInformation": ["merchant_fear", "route_changes"],
        "unlocksPath": "darkwood_investigation"
      }
    }
  ]
}
```

#### Item Types

- **quest_item**: Plot-critical objects
- **tool**: Provide new action options
- **clue**: Reveal information or unlock content
- **consumable**: One-time use items
- **weapon/armor**: Combat equipment

### AI Guidance

Instructions that ensure consistent AI behavior:

```json
{
  "aiGuidance": {
    "toneProgression": {
      "act1": "mysterious and foreboding",
      "act2": "darker and more urgent",
      "climax": "intense confrontation"
    },
    "mechanicsHandling": "Never mention numbers. Describe effects narratively.",
    "playerAgency": "Always allow creative solutions beyond quick actions.",
    "encouragedElements": [
      "Environmental storytelling",
      "Character development through dialogue",
      "Progressive revelation of supernatural elements"
    ]
  }
}
```

#### Guidance Categories

- **Tone Progression**: How mood evolves through the story
- **Mechanics Handling**: How to present stat effects naturally
- **Player Agency**: Handling creative and unexpected solutions
- **Encouraged/Forbidden Elements**: Content guidelines

### Function Calls

Define what the AI can do to modify game state:

```json
{
  "functionCalls": [
    {
      "name": "updatePlayerStats",
      "description": "Update player's hidden stats based on actions",
      "parameters": {
        "health": "number (-100 to 100) - physical condition",
        "courage": "number (-100 to 100) - bravery in dangerous situations"
      },
      "examples": [
        {
          "situation": "Player helps elderly villager",
          "call": { "trust": 10, "reputation": 5 }
        }
      ]
    }
  ]
}
```

## Validation

### TypeScript Integration

```typescript
import { ByteboundGame, validateGame } from './validation/game-schema-types';

// Type-safe game development
const myGame: ByteboundGame = {
  metadata: { /* ... */ },
  hiddenMechanics: { /* ... */ },
  // ... rest of game
};

// Runtime validation
try {
  validateGame(myGame);
  console.log("Game is valid!");
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

### CLI Validation

```bash
# Validate a single game file
npx validate-game examples/rpg-merchants-mystery.json

# Detailed validation with verbose output
npx validate-game --verbose my-game.json

# JSON output for automated processing
npx validate-game --json my-game.json
```

### Validation Levels

1. **Schema Validation**: Structure and data types
2. **ID Validation**: No duplicate IDs within collections
3. **Reference Validation**: All referenced IDs exist
4. **Logic Validation**: Semantic correctness

## Examples

### Minimal Game

```json
{
  "metadata": {
    "id": "simple-demo",
    "title": "Simple Demo",
    "description": "A basic example game",
    "version": "1.0.0",
    "gameStyle": "rpg-fantasy"
  },
  "hiddenMechanics": {
    "playerStats": {
      "health": 100,
      "courage": 50
    }
  },
  "beats": [
    {
      "id": "start",
      "title": "The Beginning",
      "description": "Your adventure starts here...",
      "quickActions": [
        {
          "id": "explore",
          "label": "Explore the area",
          "effects": {
            "statChanges": { "courage": 5 }
          }
        }
      ],
      "objectives": [
        {
          "id": "begin_adventure",
          "description": "Start your journey",
          "type": "required"
        }
      ]
    }
  ],
  "aiGuidance": {
    "toneProgression": {
      "beginning": "hopeful and adventurous"
    }
  },
  "functionCalls": [
    {
      "name": "updatePlayerStats",
      "description": "Update player statistics",
      "parameters": {
        "health": "number - physical condition",
        "courage": "number - bravery level"
      }
    }
  ]
}
```

### Complete Game Examples

- **RPG**: `examples/rpg-merchants-mystery.json` - Classic fantasy investigation
- **Horror**: `examples/horror-arctic-station.json` - Psychological survival horror
- **Heist**: `examples/heist-venetian-carnival.json` - Ocean's Eleven style crime thriller
- **Time Loop**: `examples/timeloop-tuesday-mystery.json` - Groundhog Day mystery

## Best Practices

### Game Design

1. **Start Simple**: Begin with basic stats and expand based on need
2. **Test Early**: Validate game files frequently during development
3. **Consider Consequences**: Every stat change should have narrative impact
4. **Balance Agency**: Provide both guided options and creative freedom
5. **Maintain Consistency**: Keep tone and style consistent within acts

### Technical Implementation

1. **Use TypeScript**: Leverage type safety for development
2. **Validate Continuously**: Set up automated validation in your workflow
3. **Version Control**: Use semantic versioning for game iterations
4. **Document Thoroughly**: Include clear descriptions for all components
5. **Test AI Behavior**: Verify AI guidance produces expected results

### Content Creation

1. **Write for Voice**: AI will narrate your content - make it flow naturally
2. **Hide Complexity**: Never expose mechanical details to players
3. **Create Meaningful Choices**: Every decision should feel significant
4. **Build Relationships**: Character interactions drive engagement
5. **Plan Multiple Paths**: Support different play styles and choices

### Performance Considerations

1. **Limit Scope**: 50+ beats may impact performance
2. **Optimize Stats**: More than 10 stats can become unwieldy
3. **Manage References**: Validate all ID references to prevent runtime errors
4. **Consider Memory**: Large games may need pagination strategies
5. **Test Scaling**: Verify performance with realistic data loads

## Migration Guide

### From Rough Examples

If you have existing content in the rough-example format:

1. **Extract Metadata**: Move basic info to metadata section
2. **Convert Stats**: Transform simple stats to hiddenMechanics
3. **Restructure Beats**: Combine related beats with proper objectives
4. **Add AI Guidance**: Define tone progression and handling instructions
5. **Define Functions**: Specify available AI function calls

### Version Updates

When updating schema versions:

1. **Check Breaking Changes**: Review changelog for incompatible changes
2. **Update Validation**: Use latest validator for new features
3. **Test Thoroughly**: Validate all existing games with new schema
4. **Migrate Gradually**: Update games one at a time
5. **Backup First**: Always backup before schema migrations

### Common Migration Issues

- **ID Format Changes**: Ensure all IDs follow naming conventions
- **Required Fields**: Add any newly required fields
- **Enum Values**: Update any changed enumeration values
- **Function Signatures**: Verify AI function call definitions

## Support and Resources

- **Schema File**: `bytebound-schema-v1.json`
- **TypeScript Types**: `src/validation/game-schema-types.ts`
- **Validator**: `src/validation/game-schema-validator.ts`
- **CLI Tool**: `src/tools/validate-game.ts`
- **Examples**: `examples/` directory

For questions, issues, or contributions, refer to the main Bytebound Chronicles documentation and development guidelines.