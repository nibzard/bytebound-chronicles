# MVP to New Schema Migration Guide

## Overview

This document shows the transformation of the original MVP example from `terminal_adventure_mvp_spec.md` to our new comprehensive schema format. The migration demonstrates how the new schema addresses the limitations of the original design.

## Original MVP vs New Schema

### ❌ **Original MVP Issues**
```json
{
  "metadata": {
    // Missing required "gameStyle" field
    "difficulty": "beginner" // Invalid enum value
  },
  // Missing required "hiddenMechanics" section
  "beats": [
    {
      "exitTransitions": [...], // Non-standard field
      "aiGuidance": {
        "tone": "mysterious", // Incomplete guidance
        "avoidTopics": [...] // Limited scope
      },
      "endingImplications": {...}, // Non-standard approach
      "characterArcs": {...} // Unclear implementation
    }
  ],
  // Missing required "aiGuidance" top-level section
  // Missing required "functionCalls" definitions
}
```

### ✅ **New Schema Solutions**

#### 1. **Complete Metadata**
```json
{
  "metadata": {
    "id": "merchant-mystery-mvp",
    "gameStyle": "rpg-fantasy", // Required classification
    "difficulty": "easy", // Valid enum value
    "playerInputMode": {
      "primary": "hybrid",
      "quickActionsEnabled": true,
      "customActionAlwaysAvailable": true
    }
  }
}
```

#### 2. **Hidden Mechanics Engine**
```json
{
  "hiddenMechanics": {
    "playerStats": {
      "village_reputation": 0,
      "investigation_progress": 0,
      "merchant_clues": 0,
      "aggressive_actions": 0
    },
    "thresholds": {
      "heroic_reputation": 80,
      "investigation_breakthrough": 5
    },
    "relationships": {
      "village_elder": 0,
      "tavern_keeper": 0
    }
  }
}
```

#### 3. **Structured Story Beats**
```json
{
  "beats": [
    {
      "narrativeGuidance": {
        "openingText": "Detailed scene setting...",
        "dynamicElements": {
          "high_reputation": "Conditional narrative based on stats",
          "aggressive_approach": "Different content for different approaches"
        }
      },
      "quickActions": [
        {
          "id": "approach_village_calmly",
          "effects": {
            "statChanges": {
              "village_reputation": 10,
              "villagers_general": 5
            }
          }
        }
      ],
      "exitConditions": [
        {
          "requirements": [...],
          "nextBeat": "tavern_investigation",
          "automatic": false
        }
      ]
    }
  ]
}
```

#### 4. **Comprehensive AI Guidance**
```json
{
  "aiGuidance": {
    "toneProgression": {
      "act1": "mysterious and foreboding, building tension through investigation"
    },
    "mechanicsHandling": "Never mention numbers directly. Show reputation through NPC reactions.",
    "responseToPlayerMood": {
      "aggressive": "NPCs become defensive, information harder to access",
      "diplomatic": "More information available through dialogue"
    },
    "encouragedElements": [
      "Village social dynamics",
      "Multiple investigative approaches",
      "Meaningful choice consequences"
    ]
  }
}
```

#### 5. **Function Call Definitions**
```json
{
  "functionCalls": [
    {
      "name": "updatePlayerStats",
      "description": "Update player's hidden stats based on actions",
      "parameters": {
        "village_reputation": "number (-100 to 100) - how villagers perceive player",
        "investigation_progress": "number (0 to 20) - mystery solving advancement"
      },
      "examples": [
        {
          "situation": "Player threatens villager",
          "call": {
            "village_reputation": -15,
            "aggressive_actions": 1
          }
        }
      ]
    }
  ]
}
```

## Key Improvements

### 1. **Hidden Mechanics System**
- **Original**: No invisible stat tracking
- **New**: Complete hidden mechanics drive narrative adaptation
- **Benefit**: Stories feel personalized and responsive

### 2. **AI Integration**
- **Original**: Basic tone guidance only
- **New**: Comprehensive AI behavior instructions
- **Benefit**: Consistent, engaging AI responses across all scenarios

### 3. **Player Agency**
- **Original**: Limited action definitions
- **New**: Structured quick actions with clear effects + always-available custom input
- **Benefit**: Both guided and creative gameplay options

### 4. **Validation & Type Safety**
- **Original**: No validation, prone to errors
- **New**: Complete TypeScript types and runtime validation
- **Benefit**: Catch errors early, ensure game quality

### 5. **Consequence System**
- **Original**: Unclear how choices affect story
- **New**: Explicit stat changes, relationship tracking, conditional content
- **Benefit**: Meaningful choices with visible narrative impact

## Migration Process

### Step 1: Add Required Schema Components
1. Add `gameStyle` to metadata
2. Create `hiddenMechanics` section with relevant stats
3. Add comprehensive `aiGuidance`
4. Define `functionCalls` for AI behavior

### Step 2: Transform Story Structure
1. Convert `exitTransitions` to `exitConditions`
2. Move beat-level `aiGuidance` to narrative guidance
3. Replace `endingImplications` with stat tracking
4. Convert `characterArcs` to relationship systems

### Step 3: Enhance Content
1. Add `narrativeGuidance` for better AI instruction
2. Create `quickActions` with clear effects
3. Define `hiddenTriggers` for dynamic events
4. Establish `objectives` for clear player goals

### Step 4: Validate and Test
1. Run schema validation
2. Test AI behavior with new guidance
3. Verify stat changes affect narrative
4. Ensure multiple paths work correctly

## Validation Results

### Original MVP Format
```bash
❌ Validation failed:
   • Missing required field: hiddenMechanics
   • Missing required field: aiGuidance
   • Missing required field: functionCalls
   • metadata.gameStyle is required
```

### Updated Format
```bash
✅ Validation successful
   Title: The Missing Merchant
   Game Style: rpg-fantasy
   Story Beats: 3
   Characters: 2
   Items: 2
```

## Benefits Realized

### For Players
- **Responsive Storytelling**: Hidden stats create personalized experiences
- **Clear Choices**: Actions have obvious narrative consequences
- **Multiple Approaches**: Different play styles are supported and rewarded

### For Developers  
- **Type Safety**: Compile-time error checking
- **Validation**: Catch issues before deployment
- **AI Guidance**: Predictable, consistent AI behavior
- **Extensibility**: Easy to add new content and features

### For AI Systems
- **Clear Instructions**: Comprehensive guidance for narrative generation
- **Stat Integration**: Hidden mechanics drive natural story adaptation
- **Function Definitions**: Well-defined capabilities for game state modification

## Conclusion

The transformation from MVP to new schema represents an evolution from a simple prototype to a production-ready system. The new format addresses every limitation of the original while maintaining the core vision of AI-driven narrative adventures.

Key architectural improvements:
- **Hidden mechanics** enable dynamic, personalized storytelling
- **Comprehensive AI guidance** ensures consistent quality
- **Structured validation** prevents errors and ensures quality
- **Enhanced player agency** supports both guided and creative gameplay

This migration demonstrates how thoughtful schema design can transform a basic concept into a powerful, flexible platform for creating engaging narrative experiences.