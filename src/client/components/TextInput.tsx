import React from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../contexts';
import { useKeyboard, useTextInput } from '../hooks';

interface TextInputProps {
  value?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  prefix?: string;
  multiline?: boolean;
  maxLength?: number;
  showCursor?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value: controlledValue,
  placeholder = '',
  onSubmit,
  onCancel,
  disabled = false,
  prefix = '> ',
  multiline = false,
  maxLength,
  showCursor = true,
}) => {
  const { state } = useAppContext();
  const { theme } = state;
  
  const textInput = useTextInput(controlledValue || '');
  const { value, cursor, handlers, clear } = textInput;

  const handleSubmit = () => {
    if (value.trim() && onSubmit) {
      onSubmit(value.trim());
      clear();
    }
  };

  const handleCancel = () => {
    clear();
    if (onCancel) {
      onCancel();
    }
  };

  const keyboardHandlers = {
    ...handlers,
    onEnter: multiline ? handlers.onChar?.bind(null, '\n') : handleSubmit,
    onEscape: handleCancel,
    onCtrlC: handleCancel,
    onChar: (char: string) => {
      if (maxLength && value.length >= maxLength) return;
      handlers.onChar?.(char);
    },
  };

  useKeyboard(keyboardHandlers, { enabled: !disabled });

  const displayValue = value || placeholder;
  const displayCursor = showCursor && !disabled;
  
  // Insert cursor in the text
  const textWithCursor = displayCursor 
    ? displayValue.slice(0, cursor) + '█' + displayValue.slice(cursor)
    : displayValue;

  return (
    <Box>
      <Text color={disabled ? theme.colors.muted : theme.colors.success}>
        {prefix}
      </Text>
      <Text 
        color={disabled ? theme.colors.muted : (value ? theme.colors.text : theme.colors.muted)}
        wrap={multiline ? 'wrap' : 'truncate'}
      >
        {textWithCursor}
      </Text>
      {maxLength && (
        <Text color={theme.colors.muted}>
          ({value.length}/{maxLength})
        </Text>
      )}
    </Box>
  );
};

interface MultilineTextInputProps extends Omit<TextInputProps, 'multiline'> {
  rows?: number;
  onCtrlReturn?: (value: string) => void;
}

export const MultilineTextInput: React.FC<MultilineTextInputProps> = ({
  rows = 3,
  onCtrlReturn,
  onSubmit,
  ...props
}) => {
  // TODO: Implement proper multiline text handling

  return (
    <Box flexDirection="column" height={rows}>
      <TextInput
        {...props}
        multiline
        onSubmit={onCtrlReturn || onSubmit}
      />
    </Box>
  );
};