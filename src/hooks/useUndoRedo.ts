import { useState, useEffect } from 'react';

/**
 * Custom hook for undo/redo functionality
 * @param initialValue - The initial value for the history
 * @param maxHistory - Maximum number of history entries (default: 50)
 */
export function useUndoRedo<T>(initialValue: T, maxHistory = 50) {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentValue = history[historyIndex];

  /**
   * Update the value and add to history
   * @param newValue - The new value to add to history
   * @param skipHistory - If true, don't add to history (e.g., for undo/redo operations)
   */
  const setValue = (newValue: T, skipHistory = false) => {
    if (!skipHistory && newValue !== history[historyIndex]) {
      // Remove any history after current index (when adding new changes after undo)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newValue);
      // Limit history to maxHistory entries
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      setHistory(newHistory);
    }
  };

  /**
   * Undo to previous state
   */
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  /**
   * Redo to next state
   */
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  /**
   * Set value directly (bypasses history)
   */
  const setValueDirect = (newValue: T) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory[historyIndex] = newValue;
    setHistory(newHistory);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  return {
    value: currentValue,
    setValue,
    setValueDirect,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
