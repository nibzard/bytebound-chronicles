#!/usr/bin/env node

/**
 * Simple JSON schema validation for Bytebound Chronicles examples
 * Uses basic JSON schema validation without TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

// Basic validation functions
function validateGameStructure(game) {
  const errors = [];
  
  // Check required top-level fields
  if (!game.metadata) errors.push("Missing required field: metadata");
  if (!game.hiddenMechanics) errors.push("Missing required field: hiddenMechanics");
  if (!game.beats) errors.push("Missing required field: beats");
  if (!game.aiGuidance) errors.push("Missing required field: aiGuidance");
  if (!game.functionCalls) errors.push("Missing required field: functionCalls");
  
  // Validate metadata
  if (game.metadata) {
    if (!game.metadata.id) errors.push("metadata.id is required");
    if (!game.metadata.title) errors.push("metadata.title is required");
    if (!game.metadata.version) errors.push("metadata.version is required");
    if (!game.metadata.gameStyle) errors.push("metadata.gameStyle is required");
    
    // Check ID format
    if (game.metadata.id && !/^[a-z0-9-]+$/.test(game.metadata.id)) {
      errors.push("metadata.id must be kebab-case alphanumeric");
    }
    
    // Check version format
    if (game.metadata.version && !/^\d+\.\d+\.\d+$/.test(game.metadata.version)) {
      errors.push("metadata.version must follow semantic versioning (x.y.z)");
    }
  }
  
  // Validate hiddenMechanics
  if (game.hiddenMechanics) {
    if (!game.hiddenMechanics.playerStats) {
      errors.push("hiddenMechanics.playerStats is required");
    } else if (Object.keys(game.hiddenMechanics.playerStats).length === 0) {
      errors.push("At least one player stat is required");
    }
  }
  
  // Validate beats
  if (game.beats) {
    if (!Array.isArray(game.beats)) {
      errors.push("beats must be an array");
    } else if (game.beats.length === 0) {
      errors.push("At least one story beat is required");
    } else {
      game.beats.forEach((beat, index) => {
        if (!beat.id) errors.push(`beats[${index}].id is required`);
        if (!beat.title) errors.push(`beats[${index}].title is required`);
        if (!beat.description) errors.push(`beats[${index}].description is required`);
        
        if (beat.id && !/^[a-z0-9_-]+$/.test(beat.id)) {
          errors.push(`beats[${index}].id must be lowercase alphanumeric with underscores/hyphens`);
        }
      });
    }
  }
  
  // Validate aiGuidance
  if (game.aiGuidance) {
    if (!game.aiGuidance.toneProgression) {
      errors.push("aiGuidance.toneProgression is required");
    } else if (Object.keys(game.aiGuidance.toneProgression).length === 0) {
      errors.push("aiGuidance.toneProgression must have at least one entry");
    }
  }
  
  // Validate functionCalls
  if (game.functionCalls) {
    if (!Array.isArray(game.functionCalls)) {
      errors.push("functionCalls must be an array");
    } else {
      game.functionCalls.forEach((func, index) => {
        if (!func.name) errors.push(`functionCalls[${index}].name is required`);
        if (!func.description) errors.push(`functionCalls[${index}].description is required`);
      });
    }
  }
  
  return errors;
}

function validateUniqueIds(game) {
  const errors = [];
  
  // Check for duplicate beat IDs
  if (game.beats) {
    const beatIds = new Set();
    game.beats.forEach((beat, index) => {
      if (beat.id) {
        if (beatIds.has(beat.id)) {
          errors.push(`Duplicate beat ID: ${beat.id} (at index ${index})`);
        }
        beatIds.add(beat.id);
      }
    });
  }
  
  // Check for duplicate character IDs
  if (game.characters) {
    const characterIds = new Set();
    game.characters.forEach((character, index) => {
      if (character.id) {
        if (characterIds.has(character.id)) {
          errors.push(`Duplicate character ID: ${character.id} (at index ${index})`);
        }
        characterIds.add(character.id);
      }
    });
  }
  
  // Check for duplicate item IDs
  if (game.items) {
    const itemIds = new Set();
    game.items.forEach((item, index) => {
      if (item.id) {
        if (itemIds.has(item.id)) {
          errors.push(`Duplicate item ID: ${item.id} (at index ${index})`);
        }
        itemIds.add(item.id);
      }
    });
  }
  
  return errors;
}

function validateGameFile(filePath) {
  try {
    // Load and parse the file
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const game = JSON.parse(content);
    
    // Run validations
    const structureErrors = validateGameStructure(game);
    const idErrors = validateUniqueIds(game);
    
    const allErrors = [...structureErrors, ...idErrors];
    
    return {
      success: allErrors.length === 0,
      game: game,
      errors: allErrors
    };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        errors: [`File not found: ${filePath}`]
      };
    } else if (error instanceof SyntaxError) {
      return {
        success: false,
        errors: [`Invalid JSON in file: ${filePath} - ${error.message}`]
      };
    } else {
      return {
        success: false,
        errors: [`Error reading file: ${error.message}`]
      };
    }
  }
}

function formatResults(result, filePath, verbose = false) {
  const filename = path.basename(filePath);
  
  if (result.success) {
    let output = `✅ ${filename}: Validation successful\n`;
    
    if (verbose && result.game) {
      output += `   Title: ${result.game.metadata?.title || 'Unknown'}\n`;
      output += `   Game Style: ${result.game.metadata?.gameStyle || 'Unknown'}\n`;
      output += `   Story Beats: ${result.game.beats?.length || 0}\n`;
      output += `   Characters: ${result.game.characters?.length || 0}\n`;
      output += `   Items: ${result.game.items?.length || 0}\n`;
    }
    
    return output;
  } else {
    let output = `❌ ${filename}: Validation failed\n`;
    result.errors.forEach(error => {
      output += `   • ${error}\n`;
    });
    return output;
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Bytebound Chronicles Game Validator

Usage: node validate-examples.js [options] [file...]

Options:
  --verbose, -v    Show detailed information
  --help          Show this help message

Examples:
  node validate-examples.js examples/*.json
  node validate-examples.js --verbose examples/rpg-merchants-mystery.json
`);
    return;
  }
  
  const files = args.filter(arg => !arg.startsWith('-'));
  
  if (files.length === 0) {
    // Validate all example files
    const exampleDir = 'examples';
    if (fs.existsSync(exampleDir)) {
      const exampleFiles = fs.readdirSync(exampleDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(exampleDir, file));
      
      console.log('Validating all example games...\n');
      
      let totalFiles = 0;
      let successfulFiles = 0;
      
      exampleFiles.forEach(file => {
        const result = validateGameFile(file);
        console.log(formatResults(result, file, verbose));
        totalFiles++;
        if (result.success) successfulFiles++;
      });
      
      console.log(`\nSummary: ${successfulFiles}/${totalFiles} files passed validation`);
      
      if (successfulFiles < totalFiles) {
        process.exit(1);
      }
    } else {
      console.error('❌ Examples directory not found');
      process.exit(1);
    }
  } else {
    // Validate specified files
    let allSuccessful = true;
    
    files.forEach(file => {
      const result = validateGameFile(file);
      console.log(formatResults(result, file, verbose));
      if (!result.success) allSuccessful = false;
    });
    
    if (!allSuccessful) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateGameFile, validateGameStructure, validateUniqueIds };