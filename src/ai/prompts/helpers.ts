// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Custom Handlebars helpers for AI prompt templating
 * Provides utilities for formatting data within prompt templates
 */

import Handlebars from 'handlebars';

export function registerHelpers() {
  // Safely stringify JSON objects for embedding in prompts
  Handlebars.registerHelper('jsonStringify', function(context) {
    if (!context) return '""';
    return new Handlebars.SafeString(JSON.stringify(context, null, 2));
  });

  // Format a list with proper numbering
  Handlebars.registerHelper('numberedList', function(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  });

  // Format a bulleted list
  Handlebars.registerHelper('bulletList', function(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map(item => `- ${item}`).join('\n');
  });

  // Truncate text to a maximum length
  Handlebars.registerHelper('truncate', function(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  });

  // Format timestamp for display
  Handlebars.registerHelper('formatTime', function(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  });

  // Conditional helper for checking if value exists and is not empty
  Handlebars.registerHelper('ifNotEmpty', function(this: any, value: any, options: any) {
    if (value && (typeof value !== 'object' || Object.keys(value).length > 0)) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  // Helper to get the last N items from an array
  Handlebars.registerHelper('lastN', function(array, n) {
    if (!Array.isArray(array)) return [];
    return array.slice(-n);
  });

  // Helper to capitalize first letter
  Handlebars.registerHelper('capitalize', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
}