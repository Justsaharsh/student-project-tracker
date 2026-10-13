const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const message = document.querySelector('#message');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');

const STORAGE_KEY = 'workshop-projects-v1';

// Store projects in browser memory.
let projects = [];

// null means we are adding a new project.
// Otherwise, editingId identifies the project being edited.
let editingId = null;

// Track whether saved data can safely be changed.
let storageReady = false;

// Generate a unique ID for each project.
function generateProjectId() {
  return crypto.randomUUID();
}

// Read projects from localStorage when the page starts.
function loadProjects() {
  let storedData;

  try {
    storedData = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageReady = false;
    message.textContent =
      'Could not read saved projects from browser storage. Changes cannot be saved.';
    renderProjects();
    return;
  }

  // No saved data means this is a fresh collection.
  if (storedData === null) {
    projects = [];
    storageReady = true;
    renderProjects();
    return;
  }

  let parsedData;

  try {
    parsedData = JSON.parse(storedData);
  } catch (error) {
    storageReady = false;
    message.textContent =
      'Saved project data is invalid. It has been left unchanged to protect your data.';
    renderProjects();
    return;
  }

  // Validate the overall structure and every project record.
  const isValidArray =
    Array.isArray(parsedData) &&
    parsedData.every(project =>
      project !== null &&
      typeof project === 'object' &&
      !Array.isArray(project) &&
      typeof project.id === 'string' &&
      project.id.trim() !== '' &&
      typeof project.name === 'string' &&
      typeof project.status === 'string'
    );

  if (!isValidArray) {
    storageReady = false;
    message.textContent =
      'Saved project data has an unexpected format. It has been left unchanged to protect your data.';
    renderProjects();
    return;
  }

  // Only use valid saved records.
  projects = parsedData;
  storageReady = true;
  renderProjects();
}

// Save the current projects array to localStorage.
function saveProjects() {
  if (!storageReady) {
    message.textContent =
      'Changes could not be saved because the stored data could not be safely loaded.';
    return false;
  }

  try {
    // stringify turns the projects array into storable text.
    const serializedProjects = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, serializedProjects);
    return true;
  } catch (error) {
    message.textContent =
      'Projects changed in this page, but could not be saved to browser storage.';
    return false;
  }
}

// Return the form to Add mode.
function resetForm() {
  form.reset();

  editingId = null;

  saveButton.textContent = 'Save Project';
  cancelButton.hidden = true;
}

// Display all projects.
function renderProjects() {
  projectList.replaceChildren();

  // Show the empty-state message only when no projects exist.
  emptyState.hidden = projects.length > 0;

  projects.forEach(project => {
    const listItem = document.createElement('li');

    const projectName = document.createElement('h3');
    projectName.textContent = project.name;

    const projectStatus = document.createElement('p');
    projectStatus.textContent = `Status: ${project.status}`;

    // Create the Edit button.
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';

    editButton.addEventListener('click', () => {
      if (!storageReady) {
        message.textContent =
          'Editing is unavailable because saved data could not be safely loaded.';
        return;
      }

      editingId = project.id;

      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;

      message.textContent = `Editing "${project.name}".`;

      nameInput.focus();
    });

    // Create the Delete button.
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';

    deleteButton.addEventListener('click', () => {
      if (!storageReady) {
        message.textContent =
          'Deletion is unavailable because saved data could not be safely loaded.';
        return;
      }

      // Ask for confirmation before deleting.
      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

      // Cancel leaves the collection and storage unchanged.
      if (!confirmed) {
        return;
      }

      // Find the project by its stable, unique ID.
      const projectIndex = projects.findIndex(
        item => item.id === project.id
      );

      if (projectIndex === -1) {
        message.textContent = 'Project not found.';
        return;
      }

      // Keep a copy so the in-memory change can be reversed
      // if saving to localStorage fails.
      const previousProjects = [...projects];

      projects.splice(projectIndex, 1);

      if (!saveProjects()) {
        projects = previousProjects;
        renderProjects();
        return;
      }

      // If this project was being edited, reset the form.
      if (editingId === project.id) {
        resetForm();
      }

      message.textContent = `"${project.name}" deleted.`;

      // Redraw the list and update the empty state.
      renderProjects();
    });

    listItem.append(
      projectName,
      projectStatus,
      editButton,
      deleteButton
    );

    projectList.appendChild(listItem);
  });
}

// Handle both adding and editing with one submit listener.
form.addEventListener('submit', event => {
  event.preventDefault();

  if (!storageReady) {
    message.textContent =
      'Changes cannot be saved until the saved project data can be loaded safely.';
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  // Reject an empty project name.
  if (!name) {
    message.textContent = 'Please enter a project name.';
    nameInput.focus();
    return;
  }

  if (editingId === null) {
    // Add a new project with its own unique ID.
    const newProject = {
      id: generateProjectId(),
      name: name,
      status: status
    };

    projects.push(newProject);

    if (!saveProjects()) {
      // Undo the in-memory addition if saving failed.
      projects.pop();
      renderProjects();
      return;
    }

    message.textContent = `"${name}" added successfully.`;
  } else {
    // Find the existing project using its stable ID.
    const project = projects.find(
      item => item.id === editingId
    );

    if (!project) {
      message.textContent = 'Project not found. Please try again.';
      resetForm();
      renderProjects();
      return;
    }

    // Keep a copy of the old values in case saving fails.
    const previousName = project.name;
    const previousStatus = project.status;

    project.name = name;
    project.status = status;

    if (!saveProjects()) {
      // Restore the previous values if storage fails.
      project.name = previousName;
      project.status = previousStatus;
      renderProjects();
      return;
    }

    message.textContent = `"${name}" updated successfully.`;
  }

  resetForm();
  renderProjects();
});

// Cancel editing without changing the saved project.
cancelButton.addEventListener('click', () => {
  resetForm();
  message.textContent = 'Editing cancelled. No changes were saved.';
});

// Load saved projects and display them on startup.
loadProjects();