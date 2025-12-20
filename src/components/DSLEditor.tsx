import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { dslLanguage } from './dsl-language';
import './DSLEditor.css';

interface DSLEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function DSLEditor({ value, onChange, readOnly }: DSLEditorProps) {
  return (
    <div className="dsl-editor-container" data-testid="dsl-editor">
      <div className="dsl-editor-header" data-testid="dsl-editor-header">
        DSL Editor
      </div>
      <div className="dsl-code-mirror-wrapper">
        <CodeMirror
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
          extensions={[
            ...dslLanguage,
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
            }),
          ]}
          indentWithTab={true}
        />
      </div>
    </div>
  );
}
