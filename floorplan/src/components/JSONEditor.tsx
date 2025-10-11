import { ChangeEvent, useRef, useEffect, useState } from 'react';

interface JSONEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function JSONEditor({ value, onChange, error }: JSONEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      const lineNumbersEl = document.querySelector('.line-numbers');
      if (lineNumbersEl) {
        (lineNumbersEl as HTMLElement).scrollTop = textareaRef.current.scrollTop;
      }
    }
  };

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [value]);

  return (
    <div className="editor-container">
      <h2>📏 Floorplan JSON</h2>
      <div className="editor-wrapper">
        <div className={`editor-with-lines ${error ? 'has-error' : ''}`}>
          <div className="line-numbers">
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
            />
            {error && (
              <div className="json-error-overlay">
                ❌ {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
