import { useEffect, useRef, useState } from 'react';
import './DSLEditor.css';

interface DSLEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

interface Token {
  type: string;
  value: string;
}

export function DSLEditor({ value, onChange, readOnly }: DSLEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Sync scroll between textarea and line numbers/highlighting
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current && highlightRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  };

  // Update line count when value changes
  useEffect(() => {
    // Use requestIdleCallback to avoid blocking render
    const id = requestIdleCallback(() => {
      const lines = value.split('\n').length;
      setLineCount(lines);
    });

    return () => cancelIdleCallback(id);
  }, [value]);

  // Tokenize DSL text for syntax highlighting
  const tokenize = (text: string): Token[] => {
    const tokens: Token[] = [];
    const keywords = ['room', 'part', 'window', 'door', 'object', 'at', 'grid', 'zeropoint'];
    const walls = ['top', 'bottom', 'left', 'right'];
    const swings = ['inwards-left', 'inwards-right', 'outwards-left', 'outwards-right', 'opening'];
    const anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const objectTypes = ['square', 'circle'];

    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      let remaining = line;

      // Handle comments
      const commentMatch = remaining.match(/(.*?)(#.*)$/);
      if (commentMatch) {
        remaining = commentMatch[1];
        const commentText = commentMatch[2];

        // Process the part before comment first
        processLine(remaining);

        tokens.push({
          type: 'comment',
          value: commentText,
        });

        if (lineIndex < lines.length - 1) {
          tokens.push({ type: 'newline', value: '\n' });
        }
        return;
      }

      processLine(remaining);

      if (lineIndex < lines.length - 1) {
        tokens.push({ type: 'newline', value: '\n' });
      }

      function processLine(text: string) {
        const regex =
          /(\s+)|(-?\d+)|([a-zA-Z][a-zA-Z0-9_-]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9a-fA-F]+)|([(),:]|x)|(.)/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
          const [, space, number, identifier, string, color, punct, other] = match;

          if (space) {
            tokens.push({ type: 'whitespace', value: space });
          } else if (number) {
            tokens.push({ type: 'number', value: number });
          } else if (identifier) {
            const lower = identifier.toLowerCase();
            if (keywords.includes(lower)) {
              tokens.push({ type: 'keyword', value: identifier });
            } else if (walls.includes(lower)) {
              tokens.push({ type: 'wall', value: identifier });
            } else if (swings.includes(lower)) {
              tokens.push({ type: 'swing', value: identifier });
            } else if (anchors.includes(lower)) {
              tokens.push({ type: 'anchor', value: identifier });
            } else if (objectTypes.includes(lower)) {
              tokens.push({ type: 'object-type', value: identifier });
            } else {
              tokens.push({ type: 'identifier', value: identifier });
            }
          } else if (string) {
            tokens.push({ type: 'string', value: string });
          } else if (color) {
            tokens.push({ type: 'color', value: color });
          } else if (punct) {
            tokens.push({ type: 'punctuation', value: punct });
          } else if (other) {
            // Catch any remaining characters (like stray minus signs, etc.)
            tokens.push({ type: 'punctuation', value: other });
          }
        }
      }
    });

    return tokens;
  };

  // Render highlighted text
  const renderHighlighted = () => {
    const tokens = tokenize(value);
    const result: (React.ReactElement | string)[] = [];

    tokens.forEach((token, index) => {
      const className = `dsl-${token.type}`;
      if (token.type === 'newline') {
        result.push('\n');
      } else {
        result.push(
          <span key={index} className={className}>
            {token.value}
          </span>
        );
      }
    });

    return result;
  };

  return (
    <div className="dsl-editor-container" data-testid="dsl-editor">
      <div className="dsl-editor-wrapper">
        <div className="dsl-line-numbers" ref={lineNumbersRef} data-testid="dsl-line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        <div className="dsl-editor-content">
          <div className="dsl-highlight" ref={highlightRef}>
            <pre>
              <code>{renderHighlighted()}</code>
            </pre>
          </div>

          <textarea
            ref={textareaRef}
            className="dsl-textarea"
            value={value}
            onChange={e => onChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            disabled={readOnly}
            data-testid="dsl-textarea"
          />
        </div>
      </div>
    </div>
  );
}
