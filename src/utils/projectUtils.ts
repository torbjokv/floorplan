/**
 * Utility functions for project management
 */

export interface SavedProject {
  id: string;
  name: string;
  json: string;
  timestamp: number;
}

/**
 * Generate a random project ID
 */
export function generateProjectId(): string {
  return (
    'proj_' +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Parse JSON data from URL hash
 */
export function parseHashData(): string | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  try {
    const params = new URLSearchParams(hash);
    const data = params.get('data');
    if (data) {
      return decodeURIComponent(data);
    }
    // Fallback: old format (just JSON in hash)
    return decodeURIComponent(hash);
  } catch {
    return null;
  }
}

/**
 * Load saved projects from localStorage
 */
export function loadSavedProjects(): SavedProject[] {
  try {
    const saved = localStorage.getItem('floorplan_projects');
    if (!saved) return [];

    const projects: SavedProject[] = JSON.parse(saved);
    // Migrate old projects without IDs
    let needsMigration = false;
    const migrated = projects.map(p => {
      if (!p.id) {
        needsMigration = true;
        return {
          ...p,
          id: generateProjectId(),
        };
      }
      return p;
    });

    // Save migrated data back to localStorage
    if (needsMigration) {
      localStorage.setItem('floorplan_projects', JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return [];
  }
}

/**
 * Save projects to localStorage
 */
export function saveSavedProjects(projects: SavedProject[]): void {
  localStorage.setItem('floorplan_projects', JSON.stringify(projects));
}

/**
 * Natural sort comparison function for project names
 * Handles numbers correctly (e.g., "Project 2" before "Project 10")
 */
export function naturalSort(a: SavedProject, b: SavedProject): number {
  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
