import styles from './EditorTabs.module.css';

interface EditorTabsProps {
  activeTab: 'json' | 'gui';
  onTabChange: (tab: 'json' | 'gui') => void;
}

export function EditorTabs({ activeTab, onTabChange }: EditorTabsProps) {
  return (
    <div className={styles.tabs} data-testid="editor-tabs">
      <button
        className={`${styles.tab} ${activeTab === 'gui' ? styles.active : ''}`}
        onClick={() => onTabChange('gui')}
        data-testid="tab-gui"
      >
        GUI Editor
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'json' ? styles.active : ''}`}
        onClick={() => onTabChange('json')}
        data-testid="tab-json"
      >
        JSON Editor
      </button>
    </div>
  );
}
