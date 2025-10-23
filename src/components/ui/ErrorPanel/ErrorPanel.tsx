import styles from './ErrorPanel.module.css';

interface ErrorPanelProps {
  jsonError?: string;
  positioningErrors?: string[];
}

export function ErrorPanel({ jsonError, positioningErrors = [] }: ErrorPanelProps) {
  if (!jsonError && positioningErrors.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel} data-testid="error-panel">
      {jsonError && (
        <div className={styles.jsonError} data-testid="json-error">
          <strong>JSON Error:</strong> {jsonError}
        </div>
      )}
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
