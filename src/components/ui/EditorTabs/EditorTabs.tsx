import styles from './EditorTabs.module.css';

interface EditorTabsProps {
  activeTab: 'gui' | 'dsl';
  onTabChange: (tab: 'gui' | 'dsl') => void;
}

export function EditorTabs({ activeTab, onTabChange }: EditorTabsProps) {
  return (
    <div className={styles.tabs} data-testid="editor-tabs">
      <button
        className={`${styles.tab} ${activeTab === 'dsl' ? styles.active : ''}`}
        onClick={() => onTabChange('dsl')}
        data-testid="tab-dsl"
      >
        DSL Editor
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'gui' ? styles.active : ''}`}
        onClick={() => onTabChange('gui')}
        data-testid="tab-gui"
      >
        GUI Editor
      </button>
    </div>
  );
}
