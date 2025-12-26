import { forwardRef, useImperativeHandle, useRef, useCallback, useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef, ViewUpdate } from '@uiw/react-codemirror';
import { EditorView, Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { dslLanguage } from './dsl-language';
import { detectElementType, dslDocs } from './dsl-docs-extension';
import './DSLEditor.css';

interface DSLEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export interface DSLEditorRef {
  highlightLine: (lineNumber: number) => void;
}

// StateEffect for adding/removing line highlights
const addHighlight = StateEffect.define<{ from: number; to: number }>();
const removeHighlight = StateEffect.define<void>();

// Decoration for the highlight
const highlightMark = Decoration.line({ class: 'cm-highlighted-line' });

// StateField to manage the highlight decoration
const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(addHighlight)) {
        // Create a line decoration at the specified position
        return Decoration.set([highlightMark.range(effect.value.from)]);
      }
      if (effect.is(removeHighlight)) {
        return Decoration.none;
      }
    }
    return decorations.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f),
});

export const DSLEditor = forwardRef<DSLEditorRef, DSLEditorProps>(function DSLEditor(
  { value, onChange, readOnly },
  ref
) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentElementType, setCurrentElementType] = useState<string | null>(null);

  // Get current documentation based on element type
  const currentDoc = useMemo(() => {
    if (currentElementType && dslDocs[currentElementType]) {
      return dslDocs[currentElementType];
    }
    return null;
  }, [currentElementType]);

  // Handle editor updates to track cursor position
  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (update.selectionSet || update.docChanged) {
      const pos = update.state.selection.main.head;
      const line = update.state.doc.lineAt(pos);
      const elementType = detectElementType(line.text);
      setCurrentElementType(elementType);
    }
  }, []);

  const highlightLine = useCallback((lineNumber: number) => {
    const view = editorRef.current?.view;
    if (!view) return;

    // Clear any existing highlight timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Get the line info
    const doc = view.state.doc;
    if (lineNumber < 1 || lineNumber > doc.lines) return;

    const line = doc.line(lineNumber);

    // Add the highlight
    view.dispatch({
      effects: addHighlight.of({ from: line.from, to: line.to }),
    });

    // Scroll the line into view
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, {
        y: 'center',
      }),
    });

    // Remove highlight after 2 seconds (CSS will handle the fade-out animation)
    highlightTimeoutRef.current = setTimeout(() => {
      if (editorRef.current?.view) {
        editorRef.current.view.dispatch({
          effects: removeHighlight.of(),
        });
      }
    }, 2000);
  }, []);

  // Expose the highlightLine method via ref
  useImperativeHandle(ref, () => ({
    highlightLine,
  }));

  return (
    <div className="dsl-editor-container" data-testid="dsl-editor">
      <div className="dsl-editor-header" data-testid="dsl-editor-header">
        DSL Editor
      </div>
      <div className="dsl-code-mirror-wrapper">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          className="dsl-codemirror"
          theme={vscodeDark}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: false,
            completionKeymap: false,
            lintKeymap: false,
          }}
          onUpdate={handleUpdate}
          extensions={[
            ...dslLanguage,
            highlightField,
            EditorView.lineWrapping,
            // Overlay custom syntax highlighting colors for DSL-specific tokens
            EditorView.theme({
              // DSL-specific syntax highlighting
              '.cm-keyword': {
                color: '#569cd6',
                fontWeight: 'bold',
              },
              '.cm-string': {
                color: '#ce9178',
              },
              '.cm-comment': {
                color: '#6a9955',
                fontStyle: 'italic',
              },
              '.cm-number': {
                color: '#b5cea8',
              },
              // Custom token types (via class names from language definition)
              '.cm-identifier': {
                color: '#4ec9b0',
              },
              '.cm-wall': {
                color: '#c586c0',
              },
              '.cm-swing': {
                color: '#c586c0',
              },
              '.cm-anchor': {
                color: '#ffd700',
                fontWeight: '500',
              },
              '.cm-object-type': {
                color: '#4ec9b0',
              },
              '.cm-parent': {
                color: '#c586c0',
              },
              '.cm-color': {
                color: '#ce9178',
              },
              '.cm-punctuation': {
                color: '#ffffff',
                fontWeight: '500',
              },
              // Line highlight styles
              '.cm-highlighted-line': {
                backgroundColor: 'rgba(255, 213, 0, 0.3) !important',
                animation: 'highlight-fade-out 2s ease-out forwards',
              },
            }),
          ]}
          indentWithTab={true}
        />
      </div>
      {currentDoc && (
        <div className="dsl-docs-panel" data-testid="dsl-docs-panel">
          <span className="dsl-docs-title">{currentDoc.title}</span>
          <code className="dsl-docs-syntax">{currentDoc.syntax}</code>
          <span className="dsl-docs-desc">{currentDoc.description}</span>
        </div>
      )}
    </div>
  );
});
