import { useState, useEffect } from 'react';
import { ProjectMenu } from '../ProjectMenu/ProjectMenu';
import type { SavedProject } from '../ProjectMenu/ProjectMenu';
import styles from './ProjectHeader.module.css';

interface ProjectHeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  savedProjects: SavedProject[];
  onNewProject: () => void;
  onLoadExample: () => void;
  onUploadJSON: () => void;
  onDuplicateProject: () => void;
  onDownloadJSON: () => void;
  onShare: () => void;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectHeader({
  projectName,
  onProjectNameChange,
  savedProjects,
  onNewProject,
  onLoadExample,
  onUploadJSON,
  onDuplicateProject,
  onDownloadJSON,
  onShare,
  onLoadProject,
  onDeleteProject,
}: ProjectHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Close menu on ESC key or click outside
  useEffect(() => {
    if (!showMenu) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-testid="project-header"]')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className={styles.header} data-testid="project-header">
      <input
        type="text"
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        className={styles.nameInput}
        data-testid="project-name-input"
      />
      <div className={styles.menuContainer}>
        <button
          className={styles.menuButton}
          onClick={() => setShowMenu(!showMenu)}
          data-testid="project-menu-button"
        >
          📁 Projects
        </button>
        {showMenu && (
          <ProjectMenu
            savedProjects={savedProjects}
            onNewProject={() => handleMenuAction(onNewProject)}
            onLoadExample={() => handleMenuAction(onLoadExample)}
            onUploadJSON={() => handleMenuAction(onUploadJSON)}
            onDuplicateProject={() => handleMenuAction(onDuplicateProject)}
            onDownloadJSON={() => handleMenuAction(onDownloadJSON)}
            onShare={() => handleMenuAction(onShare)}
            onLoadProject={(project) => handleMenuAction(() => onLoadProject(project))}
            onDeleteProject={onDeleteProject}
          />
        )}
      </div>
    </div>
  );
}
