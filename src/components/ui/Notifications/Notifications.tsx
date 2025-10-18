import styles from './Notifications.module.css';

interface NotificationsProps {
  showUpdate?: boolean;
  showCopy?: boolean;
  urlError?: string | null;
}

export function Notifications({
  showUpdate,
  showCopy,
  urlError,
}: NotificationsProps) {
  return (
    <>
      {showUpdate && (
        <div className={styles.update} data-testid="update-notification">
          ✓ Updated
        </div>
      )}
      {showCopy && (
        <div className={styles.copy} data-testid="copy-notification">
          ✓ Link copied to clipboard!
        </div>
      )}
      {urlError && (
        <div className={styles.urlError} data-testid="url-error-notification">
          ⚠ {urlError}
        </div>
      )}
    </>
  );
}
