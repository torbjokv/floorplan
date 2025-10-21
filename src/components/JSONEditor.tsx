import { type ChangeEvent, useRef, useEffect, useState } from 'react';

interface JSONEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warnings?: string[];
}

export function JSONEditor({ value, onChange, error, warnings }: JSONEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [value]);

  return (
    <div className="editor-container" data-testid="json-editor">
      <h2>📏 Floorplan JSON</h2>
      <div className="editor-wrapper">
        <div className={`editor-with-lines ${error || (warnings && warnings.length > 0) ? 'has-error' : ''}`}>
          <div ref={lineNumbersRef} className="line-numbers" data-testid="line-numbers">
            {lineNumbers.map(num => (
              <div key={num} className="line-number">
                {num}
              </div>
            ))}
          </div>
          <div className="editor-text-wrapper">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onScroll={handleScroll}
              className="json-editor"
              spellCheck={false}
              data-testid="json-textarea"
            />
            {error && (
              <div className="json-error-overlay" data-testid="json-error">
                ❌ {error}
              </div>
            )}
            {!error && warnings && warnings.length > 0 && (
              <div className="json-error-overlay json-warning-overlay" data-testid="json-warnings">
                <strong>⚠️ Positioning Errors:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
