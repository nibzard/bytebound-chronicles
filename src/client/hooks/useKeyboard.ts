import { useInput } from 'ink';
import { useCallback, useRef, useState } from 'react';

export interface KeyboardHandler {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBackspace?: () => void;
  onTab?: () => void;
  onChar?: (char: string) => void;
  onCtrlC?: () => void;
  onSpace?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onNumber?: (num: number) => void;
  onFunction?: (key: string) => void;
}

export const useKeyboard = (handlers: KeyboardHandler, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleInput = useCallback((input: string, key: any) => {
    if (!enabled) return;

    const h = handlersRef.current;

    // Arrow keys
    if (key.upArrow && h.onUp) {
      h.onUp();
      return;
    }
    if (key.downArrow && h.onDown) {
      h.onDown();
      return;
    }
    if (key.leftArrow && h.onLeft) {
      h.onLeft();
      return;
    }
    if (key.rightArrow && h.onRight) {
      h.onRight();
      return;
    }

    // Page navigation
    if (key.pageUp && h.onPageUp) {
      h.onPageUp();
      return;
    }
    if (key.pageDown && h.onPageDown) {
      h.onPageDown();
      return;
    }
    if (key.home && h.onHome) {
      h.onHome();
      return;
    }
    if (key.end && h.onEnd) {
      h.onEnd();
      return;
    }

    // Special keys
    if (key.return && h.onEnter) {
      h.onEnter();
      return;
    }
    if (key.escape && h.onEscape) {
      h.onEscape();
      return;
    }
    if ((key.backspace || key.delete) && h.onBackspace) {
      h.onBackspace();
      return;
    }
    if (key.tab && h.onTab) {
      h.onTab();
      return;
    }
    if (input === ' ' && h.onSpace) {
      h.onSpace();
      return;
    }

    // Control combinations
    if (key.ctrl && input === 'c' && h.onCtrlC) {
      h.onCtrlC();
      return;
    }

    // Numbers
    if (input && /^[0-9]$/.test(input) && h.onNumber) {
      h.onNumber(parseInt(input, 10));
      return;
    }

    // Function keys
    if (key.f1 || key.f2 || key.f3 || key.f4 || key.f5 || key.f6 || key.f7 || key.f8 || key.f9 || key.f10 || key.f11 || key.f12) {
      const fKey = Object.keys(key).find(k => k.startsWith('f') && key[k]);
      if (fKey && h.onFunction) {
        h.onFunction(fKey);
        return;
      }
    }

    // Character input
    if (input && !key.ctrl && !key.meta && !key.shift && h.onChar) {
      h.onChar(input);
      return;
    }
  }, [enabled]);

  useInput(handleInput, { isActive: enabled });
};

// Helper hook for text input
export const useTextInput = (initialValue = '') => {
  const [value, setValue] = useState(initialValue);
  const [cursor, setCursor] = useState(initialValue.length);

  const handlers: KeyboardHandler = {
    onChar: (char) => {
      setValue(prev => prev.slice(0, cursor) + char + prev.slice(cursor));
      setCursor(prev => prev + 1);
    },
    onBackspace: () => {
      if (cursor > 0) {
        setValue(prev => prev.slice(0, cursor - 1) + prev.slice(cursor));
        setCursor(prev => prev - 1);
      }
    },
    onLeft: () => setCursor(prev => Math.max(0, prev - 1)),
    onRight: () => setCursor(prev => Math.min(value.length, prev + 1)),
    onHome: () => setCursor(0),
    onEnd: () => setCursor(value.length),
  };

  return {
    value,
    setValue,
    cursor,
    handlers,
    clear: () => {
      setValue('');
      setCursor(0);
    },
  };
};

// Helper hook for list navigation
export const useListNavigation = (itemCount: number, initialIndex = 0) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const handlers: KeyboardHandler = {
    onUp: () => setSelectedIndex(prev => Math.max(0, prev - 1)),
    onDown: () => setSelectedIndex(prev => Math.min(itemCount - 1, prev + 1)),
    onHome: () => setSelectedIndex(0),
    onEnd: () => setSelectedIndex(itemCount - 1),
    onPageUp: () => setSelectedIndex(prev => Math.max(0, prev - 10)),
    onPageDown: () => setSelectedIndex(prev => Math.min(itemCount - 1, prev + 10)),
    onNumber: (num) => {
      if (num >= 1 && num <= itemCount) {
        setSelectedIndex(num - 1);
      }
    },
  };

  return {
    selectedIndex,
    setSelectedIndex,
    handlers,
  };
};