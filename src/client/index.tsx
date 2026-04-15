import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { TerminalClient } from './TerminalClient';

// Check if stdin supports raw mode (for interactive input)
if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error('❌ Raw mode is not supported in this terminal environment.');
  console.log('📋 To run the terminal client:');
  console.log('   1. Open Terminal.app, iTerm2, or another proper terminal');
  console.log('   2. Navigate to the project directory');
  console.log('   3. Run: npm run dev:client');
  console.log('');
  console.log('💡 The terminal client requires keyboard input support that');
  console.log('   is not available in non-interactive environments.');
  process.exit(1);
}

render(<TerminalClient />);
