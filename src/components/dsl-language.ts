import { StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Define DSL language for syntax highlighting
const dslLanguage = StreamLanguage.define({
  token(stream) {
    // Handle comments
    if (stream.match(/#.*/)) {
      return 'comment';
    }

    // Handle strings (double or single quoted)
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
      return 'string';
    }
    if (stream.match(/'(?:[^'\\]|\\.)*'/)) {
      return 'string';
    }

    // Handle color codes
    if (stream.match(/#[0-9a-fA-F]+/)) {
      return 'color';
    }

    // Handle numbers (including negative)
    if (stream.match(/-?\d+/)) {
      return 'number';
    }

    // Handle identifiers and keywords
    if (stream.match(/[a-zA-Z][a-zA-Z0-9_-]*/)) {
      const word = stream.current().toLowerCase();

      // Keywords
      const keywords = ['room', 'part', 'window', 'door', 'object', 'at', 'grid', 'zeropoint'];
      if (keywords.includes(word)) {
        return 'keyword';
      }

      // Wall positions
      const walls = ['top', 'bottom', 'left', 'right'];
      if (walls.includes(word)) {
        return 'wall';
      }

      // Swing directions
      const swings = [
        'inwards-left',
        'inwards-right',
        'outwards-left',
        'outwards-right',
        'opening',
      ];
      if (swings.includes(word)) {
        return 'swing';
      }

      // Anchors
      const anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      if (anchors.includes(word)) {
        return 'anchor';
      }

      // Object types
      const objectTypes = ['square', 'circle'];
      if (objectTypes.includes(word)) {
        return 'object-type';
      }

      // Parent reference
      if (word === 'parent') {
        return 'parent';
      }

      return 'identifier';
    }

    // Handle punctuation and 'x' in dimensions
    if (stream.match(/[(),:]|x/)) {
      return 'punctuation';
    }

    // Skip whitespace
    if (stream.match(/\s+/)) {
      return null;
    }

    // Catch any other character
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '#' },
  },
});

// Define style tags for the DSL tokens
export const dslHighlightStyle = [
  { tag: t.keyword, class: 'cm-keyword' },
  { tag: t.string, class: 'cm-string' },
  { tag: t.comment, class: 'cm-comment' },
  { tag: t.number, class: 'cm-number' },
];

export { dslLanguage };
