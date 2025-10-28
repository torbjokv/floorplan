import styles from './ProjectMenu.module.css';
import { naturalSort } from '../../../utils/projectUtils';

export interface SavedProject {
  id: string;
  name: string;
  json: string;
  timestamp: number;
}

interface ProjectMenuProps {
  savedProjects: SavedProject[];
  onNewProject: () => void;
  onLoadExample: () => void;
  onUploadJSON: () => void;
  onDuplicateProject: () => void;
  onShare: () => void;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectMenu({
  savedProjects,
  onNewProject,
  onLoadExample,
  onUploadJSON,
  onDuplicateProject,
  onShare,
  onLoadProject,
  onDeleteProject,
}: ProjectMenuProps) {
  return (
    <div className={styles.menu} data-testid="project-menu">
      <button onClick={onNewProject} className={styles.menuItem} data-testid="project-menu-new">
        📄 New Project
      </button>
      <button
        onClick={onLoadExample}
        className={styles.menuItem}
        data-testid="project-menu-load-example"
      >
        📋 Load Example
      </button>
      <button onClick={onUploadJSON} className={styles.menuItem} data-testid="project-menu-upload">
        📁 Upload JSON
      </button>
      <button
        onClick={onDuplicateProject}
        className={styles.menuItem}
        data-testid="project-menu-duplicate"
      >
        📑 Duplicate Current Project
      </button>

      <div className={styles.divider} />

      <button onClick={onShare} className={styles.menuItem} data-testid="project-menu-share">
        🔗 Share
      </button>

      <div className={styles.divider} />

      <div className={styles.label} data-testid="project-menu-saved-label">
        Saved Projects:
      </div>
      {savedProjects.length === 0 ? (
        <div className={styles.empty} data-testid="project-menu-empty">
          No saved projects
        </div>
      ) : (
        savedProjects.sort(naturalSort).map(project => (
          <div
            key={project.id}
            className={styles.savedItem}
            data-testid={`project-menu-saved-${project.id}`}
          >
            <button
              onClick={() => onLoadProject(project)}
              className={styles.loadButton}
              data-testid={`project-menu-load-${project.id}`}
            >
              {project.name}
            </button>
            <button
              onClick={() => onDeleteProject(project.id)}
              className={styles.deleteButton}
              data-testid={`project-menu-delete-${project.id}`}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
}
