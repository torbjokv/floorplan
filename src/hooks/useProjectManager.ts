import { useState } from 'react';
import type { SavedProject } from '../components/ui/ProjectMenu/ProjectMenu';
import { generateProjectId, loadSavedProjects, saveSavedProjects } from '../utils/projectUtils';

const defaultJSON = `{
  "grid_step": 1000,
  "rooms": [
    {
      "id": "livingroom1",
      "name": "Living Room",
      "attachTo": "zeropoint:top-left",
      "width": 4000,
      "depth": 3000
    }
  ]
}`;

/**
 * Hook to manage project state and operations
 */
export function useProjectManager() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadSavedProjects);

  const [projectName, setProjectName] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const name = params.get('name');
        const urlId = params.get('id');
        if (name) {
          const decodedName = decodeURIComponent(name);
          const projects = loadSavedProjects();

          // If this project ID exists in saved projects, use the name as-is (it's a refresh)
          if (urlId && projects.some(p => p.id === decodeURIComponent(urlId))) {
            return decodedName;
          }

          // Otherwise, check for duplicate names and append number if needed
          const existingNames = new Set(projects.map(p => p.name));
          if (existingNames.has(decodedName)) {
            let num = 2;
            while (existingNames.has(`${decodedName} ${num}`)) {
              num++;
            }
            return `${decodedName} ${num}`;
          }
          return decodedName;
        }
      } catch {
        // Ignore
      }
    }
    return 'Untitled Project';
  });

  const [projectId, setProjectId] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        if (id) {
          return decodeURIComponent(id);
        }
      } catch {
        // Ignore
      }
    }
    return generateProjectId();
  });

  const [isExistingProject, setIsExistingProject] = useState<boolean>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        if (id) {
          const projects = loadSavedProjects();
          return projects.some(p => p.id === decodeURIComponent(id));
        }
      } catch {
        // Ignore
      }
    }
    return false;
  });

  const loadProject = (project: SavedProject) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setIsExistingProject(false); // Allow auto-save for loaded projects from localStorage
    return project.json;
  };

  const duplicateProject = (project?: SavedProject, currentJson?: string) => {
    const sourceProject = project || {
      id: projectId,
      name: projectName,
      json: currentJson || '',
      timestamp: Date.now()
    };

    const newId = generateProjectId();
    let newName = sourceProject.name;

    let counter = 2;
    while (savedProjects.some(p => p.name === newName)) {
      newName = `${sourceProject.name} ${counter}`;
      counter++;
    }

    const duplicatedProject: SavedProject = {
      id: newId,
      name: newName,
      json: sourceProject.json,
      timestamp: Date.now()
    };

    const updated = [duplicatedProject, ...savedProjects];
    setSavedProjects(updated);
    saveSavedProjects(updated);

    setProjectId(newId);
    setProjectName(newName);
    setIsExistingProject(false);

    return sourceProject.json;
  };

  const deleteProject = (projectIdToDelete: string) => {
    const updated = savedProjects.filter(p => p.id !== projectIdToDelete);
    setSavedProjects(updated);
    saveSavedProjects(updated);
  };

  const newProject = () => {
    setProjectId(generateProjectId());
    setProjectName('Untitled Project');
    setIsExistingProject(false);
    return defaultJSON;
  };

  const loadExample = () => {
    setProjectId(generateProjectId());
    setProjectName('Example Floorplan');
    return defaultJSON;
  };

  return {
    savedProjects,
    setSavedProjects,
    projectName,
    setProjectName,
    projectId,
    isExistingProject,
    loadProject,
    duplicateProject,
    deleteProject,
    newProject,
    loadExample,
  };
}
