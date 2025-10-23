import styles from './UndoRedoControls.module.css';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <div className={styles.container} data-testid="undo-redo-controls">
      <button
        className={styles.button}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        data-testid="undo-button"
      >
        ↶ Undo
      </button>
      <button
        className={styles.button}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        data-testid="redo-button"
      >
        ↷ Redo
      </button>
      <a
        href="https://github.com/torbjokv/floorplan"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.manualLink}
        title="View JSON format documentation"
        data-testid="manual-link"
      >
        📖 Manual
      </a>
    </div>
  );
}
