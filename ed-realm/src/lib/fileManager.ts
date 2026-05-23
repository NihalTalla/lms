// File Management Utility for Code Practice
export interface SavedFile {
  id: string;
  name: string;
  code: string;
  language: string;
  timestamp: number;
  lastModified: number;
  problemId?: string; // For CodeEditor files
}

const STORAGE_KEY = 'saved_code_files';
const MAX_FILES = 50;

export const FileManager = {
  // Save a file to browser storage
  saveFile: (
    name: string,
    code: string,
    language: string,
    problemId?: string
  ): SavedFile => {
    const files = FileManager.getAllFiles();
    
    // Check if file with same name exists
    const existingIndex = files.findIndex(f => f.name === name);
    
    const fileData: SavedFile = {
      id: existingIndex >= 0 ? files[existingIndex].id : `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      code,
      language,
      timestamp: existingIndex >= 0 ? files[existingIndex].timestamp : Date.now(),
      lastModified: Date.now(),
      problemId,
    };

    if (existingIndex >= 0) {
      files[existingIndex] = fileData;
    } else {
      if (files.length >= MAX_FILES) {
        // Remove oldest file
        files.sort((a, b) => a.lastModified - b.lastModified);
        files.shift();
      }
      files.push(fileData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    return fileData;
  },

  // Get all saved files
  getAllFiles: (): SavedFile[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading saved files:', error);
      return [];
    }
  },

  // Get files for a specific problem
  getFilesByProblem: (problemId: string): SavedFile[] => {
    const files = FileManager.getAllFiles();
    return files.filter(f => f.problemId === problemId);
  },

  // Get a specific file by ID
  getFile: (id: string): SavedFile | null => {
    const files = FileManager.getAllFiles();
    return files.find(f => f.id === id) || null;
  },

  // Delete a file
  deleteFile: (id: string): boolean => {
    const files = FileManager.getAllFiles();
    const filtered = files.filter(f => f.id !== id);
    if (filtered.length < files.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  // Rename a file
  renameFile: (id: string, newName: string): SavedFile | null => {
    const files = FileManager.getAllFiles();
    const fileIndex = files.findIndex(f => f.id === id);
    
    if (fileIndex >= 0) {
      files[fileIndex].name = newName;
      files[fileIndex].lastModified = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      return files[fileIndex];
    }
    return null;
  },

  // Export file as downloadable
  downloadFile: (file: SavedFile) => {
    const element = document.createElement('a');
    const fileExtension = FileManager.getFileExtension(file.language);
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(file.code));
    element.setAttribute('download', `${file.name}${fileExtension}`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  },

  // Get file extension by language
  getFileExtension: (language: string): string => {
    const extensions: { [key: string]: string } = {
      python: '.py',
      java: '.java',
      cpp: '.cpp',
      c: '.c',
    };
    return extensions[language] || '.txt';
  },

  // Format date
  formatDate: (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  },

  // Clear all files
  clearAllFiles: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
