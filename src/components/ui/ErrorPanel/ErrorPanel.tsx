import styles from './ErrorPanel.module.css';
import type { DSLError } from '../../../dslUtils';

interface ErrorPanelProps {
  jsonError?: string;
  positioningErrors?: string[];
  dslErrors?: DSLError[];
}

export function ErrorPanel({ jsonError, positioningErrors = [], dslErrors = [] }: ErrorPanelProps) {
  if (!jsonError && positioningErrors.length === 0 && dslErrors.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel} data-testid="error-panel">
      {jsonError && (
        <div className={styles.jsonError} data-testid="json-error">
          <strong>Syntax Error:</strong> {jsonError}
        </div>
      )}
      {dslErrors.map((error, idx) => (
        <div key={`dsl-${idx}`} className={styles.jsonError} data-testid={`dsl-error-${idx}`}>
          <strong>Syntax Error:</strong> {error.message}
          {error.line && ` (Line ${error.line}, Column ${error.column})`}
        </div>
      ))}
      {positioningErrors.map((error, idx) => (
        <div
          key={idx}
          className={
            error.startsWith('Error:') ? styles.positioningError : styles.positioningWarning
          }
          data-testid={`positioning-${error.startsWith('Error:') ? 'error' : 'warning'}-${idx}`}
        >
          {error}
        </div>
      ))}
    </div>
  );
}
