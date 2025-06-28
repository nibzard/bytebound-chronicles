#!/usr/bin/env node

/**
 * CLI tool for validating Bytebound Chronicles game files
 * Usage: npx validate-game <path-to-game-file>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateCompleteGame } from '../validation/game-schema-validator';

interface CliOptions {
  file: string;
  verbose?: boolean;
  outputFormat?: 'text' | 'json';
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    file: '',
    verbose: false,
    outputFormat: 'text'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.outputFormat = 'json';
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-') && !options.file) {
      options.file = arg;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Bytebound Chronicles Game Validator

Usage: validate-game [options] <game-file>

Arguments:
  game-file          Path to the JSON game file to validate

Options:
  -v, --verbose      Show detailed validation information
  --json             Output results in JSON format
  -h, --help         Show this help message

Examples:
  validate-game my-game.json
  validate-game --verbose examples/rpg-merchants-mystery.json
  validate-game --json games/horror-station.json
`);
}

function loadGameFile(filePath: string): unknown {
  try {
    const resolvedPath = resolve(filePath);
    const fileContent = readFileSync(resolvedPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${filePath}`);
      } else if (error.message.includes('Unexpected token')) {
        throw new Error(`Invalid JSON in file: ${filePath}`);
      }
    }
    throw error;
  }
}

function formatTextOutput(result: any, options: CliOptions): string {
  if (result.success) {
    const game = result.data;
    let output = `✅ Game validation successful!\n\n`;
    
    if (options.verbose) {
      output += `Game Details:\n`;
      output += `  Title: ${game.metadata.title}\n`;
      output += `  ID: ${game.metadata.id}\n`;
      output += `  Version: ${game.metadata.version}\n`;
      output += `  Style: ${game.metadata.gameStyle}\n`;
      output += `  Difficulty: ${game.metadata.difficulty || 'normal'}\n`;
      output += `  Estimated Length: ${game.metadata.estimatedLength || 'not specified'} minutes\n`;
      output += `  Story Beats: ${game.beats.length}\n`;
      output += `  Characters: ${game.characters?.length || 0}\n`;
      output += `  Items: ${game.items?.length || 0}\n`;
      output += `  Endings: ${game.endings?.length || 0}\n`;
      output += `  Player Stats: ${Object.keys(game.hiddenMechanics.playerStats).length}\n`;
      
      if (game.metadata.tags && game.metadata.tags.length > 0) {
        output += `  Tags: ${game.metadata.tags.join(', ')}\n`;
      }
      
      if (game.metadata.contentWarnings && game.metadata.contentWarnings.length > 0) {
        output += `  Content Warnings: ${game.metadata.contentWarnings.join(', ')}\n`;
      }
    }
    
    return output;
  } else {
    let output = `❌ Game validation failed!\n\n`;
    output += `Errors found:\n`;
    
    result.errors?.forEach((error: string, index: number) => {
      output += `  ${index + 1}. ${error}\n`;
    });
    
    return output;
  }
}

function formatJsonOutput(result: any): string {
  return JSON.stringify(result, null, 2);
}

async function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: No game file specified\n');
    printHelp();
    process.exit(1);
  }
  
  const options = parseArgs(args);
  
  if (!options.file) {
    console.error('Error: No game file specified\n');
    printHelp();
    process.exit(1);
  }
  
  try {
    // Load and parse the game file
    if (options.verbose && options.outputFormat === 'text') {
      console.log(`Loading game file: ${options.file}`);
    }
    
    const gameData = loadGameFile(options.file);
    
    // Validate the game
    if (options.verbose && options.outputFormat === 'text') {
      console.log('Validating game structure...\n');
    }
    
    const validationResult = validateCompleteGame(gameData);
    
    // Output results
    if (options.outputFormat === 'json') {
      console.log(formatJsonOutput(validationResult));
    } else {
      console.log(formatTextOutput(validationResult, options));
    }
    
    // Exit with appropriate code
    process.exit(validationResult.success ? 0 : 1);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        success: false,
        errors: [errorMessage]
      }, null, 2));
    } else {
      console.error(`❌ Error: ${errorMessage}`);
    }
    
    process.exit(1);
  }
}

// Additional validation functions for specific use cases
export function validateGameDirectory(directory: string): Promise<{
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  results: Array<{ file: string; valid: boolean; errors?: string[] }>;
}> {
  // Implementation for batch validation would go here
  // This is a placeholder for future enhancement
  return Promise.resolve({
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    results: []
  });
}

export function generateValidationReport(results: any[]): string {
  // Implementation for detailed reporting would go here
  // This is a placeholder for future enhancement
  return '';
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}