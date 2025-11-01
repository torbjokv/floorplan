import { StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Define DSL language for syntax highlighting
const dslLanguage = StreamLanguage.define({
  token(stream) {
    // Handle strings first (double or single quoted)
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
      return 'string';
    }
    if (stream.match(/'(?:[^'\\]|\\.)*'/)) {
      return 'string';
    }

    // Handle color codes (BEFORE comments to avoid matching # as comment start)
    if (stream.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/)) {
      return 'color';
    }

    // Handle comments (after color codes)
    if (stream.match(/#.*/)) {
      return 'comment';
    }

    // Handle dimensions (e.g., 4000x3000 or 1000x1000) as a single token
    // MUST come before number matching to capture the complete dimension
    if (stream.match(/\d+x\d+/)) {
      return 'number';
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

    // Handle punctuation
    if (stream.match(/[(),]/)) {
      return 'punctuation';
    }

    // Handle colon
    if (stream.match(/:/)) {
      return 'punctuation';
    }

    // Handle 'x' as a number (for dimension separator) to make it green
    if (stream.match(/x/)) {
      return 'number';
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
