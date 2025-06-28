# Bytebound Chronicles Game Development Quick Start

## 5-Minute Setup

### 1. Choose Your Game Style

Pick a genre and reference the appropriate example:

- **Fantasy RPG**: Classic adventure with stats, combat, exploration
- **Horror/Survival**: Psychological tension with resource management  
- **Heist/Crime**: Strategic planning with crew dynamics
- **Romance/Dating**: Social interaction with relationship building
- **Sci-Fi/Exploration**: Discovery-focused with technology themes
- **Time Loop/Mystery**: Investigation with accumulated knowledge

### 2. Copy a Template

Start with the closest example game:

```bash
cp examples/rpg-merchants-mystery.json my-game.json
```

### 3. Customize Metadata

Edit the basic information:

```json
{
  "metadata": {
    "id": "my-unique-game-id",
    "title": "My Amazing Adventure", 
    "description": "Your story premise in one sentence",
    "version": "1.0.0",
    "gameStyle": "rpg-fantasy",
    "difficulty": "normal"
  }
}
```

### 4. Define Core Stats

Choose 4-6 stats that drive your story:

```json
{
  "hiddenMechanics": {
    "playerStats": {
      "health": 100,
      "courage": 50,
      "knowledge": 0,
      "reputation": 30
    },
    "thresholds": {
      "lowHealth": 30,
      "highCourage": 80,
      "knowledgeable": 5
    }
  }
}
```

### 5. Create Your First Beat

Start with an opening scene:

```json
{
  "beats": [
    {
      "id": "opening_scene",
      "title": "The Adventure Begins",
      "description": "Describe the opening situation",
      "quickActions": [
        {
          "id": "explore",
          "label": "Look around carefully",
          "effects": {
            "statChanges": { "knowledge": 1 }
          }
        },
        {
          "id": "act_bold",
          "label": "Take decisive action", 
          "effects": {
            "statChanges": { "courage": 10 }
          }
        }
      ],
      "objectives": [
        {
          "id": "start_adventure",
          "description": "Begin your journey",
          "type": "required"
        }
      ]
    }
  ]
}
```

### 6. Validate Your Game

```bash
npx validate-game my-game.json
```

Fix any errors reported by the validator.

### 7. Test with AI

Load your game into the Bytebound Chronicles engine and test the opening beat to ensure the AI interprets your content correctly.

## 30-Minute Development

### Expand Your Story

1. **Add 2-3 More Beats**: Create a complete act with progression
2. **Create Key NPCs**: Add characters with dialogue trees
3. **Design Important Items**: Tools, clues, or weapons that matter
4. **Plan Multiple Endings**: Different outcomes based on player choices

### Advanced Features

```json
{
  "characters": [
    {
      "id": "helpful_guide",
      "name": "Marina the Guide",
      "personality": ["helpful", "mysterious", "knowledgeable"],
      "dialogueTrees": {
        "first_meeting": {
          "text": "You look like you could use some guidance, traveler.",
          "playerOptions": [
            {
              "text": "I could use help",
              "effects": { "statChanges": { "reputation": 5 } },
              "leadsTo": "offer_help"
            }
          ]
        }
      }
    }
  ],
  "items": [
    {
      "id": "ancient_map",
      "name": "Ancient Map",
      "description": "A weathered map showing hidden paths",
      "type": "tool",
      "effects": {
        "revealsInformation": ["secret_route"],
        "unlocksPath": "hidden_area"
      }
    }
  ]
}
```

### AI Guidance Setup

```json
{
  "aiGuidance": {
    "toneProgression": {
      "act1": "mysterious and intriguing",
      "act2": "building tension and urgency", 
      "climax": "intense and dramatic"
    },
    "mechanicsHandling": "Describe stat effects through narrative, never mention numbers",
    "playerAgency": "Always allow creative solutions beyond the quick actions"
  }
}
```

## Common Patterns

### Stat-Driven Narrative

```json
{
  "narrativeGuidance": {
    "dynamicElements": {
      "lowHealth": "You struggle to keep up, breathing heavily",
      "highCourage": "You stride forward confidently, inspiring others",
      "knowledgeable": "Your research has prepared you for this moment"
    }
  }
}
```

### Conditional Actions

```json
{
  "quickActions": [
    {
      "id": "use_map",
      "label": "Consult the ancient map",
      "visible": false,
      "requirements": [
        {
          "type": "item",
          "condition": "ancient_map"
        }
      ],
      "effects": {
        "revealsAction": "take_shortcut"
      }
    }
  ]
}
```

### Progressive Revelation

```json
{
  "hiddenTriggers": [
    {
      "condition": {
        "type": "stat",
        "condition": "knowledge",
        "value": 5,
        "operator": ">="
      },
      "effect": "reveal_secret_location",
      "narrative": "Your accumulated knowledge reveals a pattern..."
    }
  ]
}
```

## Testing Checklist

- [ ] Game validates without errors
- [ ] All beat IDs are unique  
- [ ] All referenced items/characters exist
- [ ] Quick actions have clear effects
- [ ] Objectives provide clear direction
- [ ] AI guidance covers main scenarios
- [ ] Multiple paths through content exist
- [ ] Stat changes feel meaningful in narrative

## Next Steps

1. **Read Full Documentation**: Review `SCHEMA_DOCUMENTATION.md`
2. **Study Examples**: Examine complete games in `examples/`
3. **Join Community**: Connect with other developers
4. **Iterate Rapidly**: Test and refine based on player feedback
5. **Consider Localization**: Plan for multiple languages early

## Common Mistakes to Avoid

❌ **Exposing mechanics**: "You gain +10 courage"
✅ **Natural description**: "You feel more confident about facing the challenge ahead"

❌ **Too many stats**: 15 different tracked values
✅ **Focused design**: 4-6 core stats that really matter

❌ **Linear progression**: Only one path through story
✅ **Multiple approaches**: Several ways to solve each challenge

❌ **Forgetting validation**: Publishing without checking schema
✅ **Regular validation**: Check your game file after every major change

❌ **Inconsistent tone**: Mixing comedy and horror randomly
✅ **Planned progression**: Deliberate tone evolution through acts

## Getting Help

- **Validation Errors**: Use `--verbose` flag for detailed information
- **Schema Questions**: Check `SCHEMA_DOCUMENTATION.md`
- **Design Advice**: Study existing examples for patterns
- **AI Integration**: Review function call specifications

Remember: Start simple, validate often, and let the story guide your mechanical choices!