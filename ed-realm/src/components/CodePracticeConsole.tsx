import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Play, RotateCcw, ArrowLeft, Save, Download, FolderOpen, Trash2, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { FileManager, SavedFile } from '../lib/fileManager';
import { toast } from 'sonner';
import { EdRealmLogo } from './EdRealmLogo';

export function CodePracticeConsole({ onBack, className = "h-screen" }: { onBack?: () => void; className?: string }) {
  const templates: Record<string, string> = {
    python: `print("Hello, World!")\n\ndef add(a, b):\n    return a + b\n\nprint("2 + 3 =", add(2, 3))`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n        System.out.println(\"2 + 3 = \" + add(2, 3));\n    }\n\n    static int add(int a, int b) {\n        return a + b;\n    }\n}\n`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    cout << \"2 + 3 = \" << add(2, 3) << endl;\n    return 0;\n}\n`,
    c: `#include <stdio.h>\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    printf(\"2 + 3 = %d\\n\", add(2, 3));\n    return 0;\n}\n`,
  };

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(templates.python);
  const allowedLanguages = ['python', 'java', 'cpp', 'c'];
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showFileMenu, setShowFileMenu] = useState(false);

  // Load saved files on mount
  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = () => {
    const files = FileManager.getAllFiles();
    setSavedFiles(files);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...\n');

    try {
      setOutput(`Execution simulated for ${language}.`);
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}`);
    }

    setIsRunning(false);
  };

  const saveFile = () => {
    if (!fileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    try {
      FileManager.saveFile(fileName, code, language);
      toast.success(`File "${fileName}" saved successfully!`);
      setShowSaveDialog(false);
      setFileName('');
      loadSavedFiles();
    } catch (error) {
      toast.error('Error saving file');
    }
  };

  const downloadFile = (file: SavedFile) => {
    try {
      FileManager.downloadFile(file);
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      toast.error('Error downloading file');
    }
  };

  const deleteFile = (id: string, name: string) => {
    if (FileManager.deleteFile(id)) {
      toast.success(`File "${name}" deleted`);
      loadSavedFiles();
    } else {
      toast.error('Error deleting file');
    }
  };

  const loadFile = (file: SavedFile) => {
    setCode(file.code);
    setLanguage(allowedLanguages.includes(file.language) ? file.language : 'python');
    setShowFilesDialog(false);
    toast.success(`Loaded "${file.name}"`);
  };

  const clearConsole = () => {
    setOutput('');
  };

  const resetCode = () => {
    setCode(templates[language] || templates.python);
    setOutput('');
  };

  return (
    <>
      <Card className={`${className} flex flex-col`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <EdRealmLogo size="small" />
              {onBack && (
                <Button onClick={onBack} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              )}
              <CardTitle>Code Practice Console</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={runCode} disabled={isRunning} size="sm">
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>

              <Button onClick={() => setShowSaveDialog(true)} variant="outline" size="sm" title="Save file">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>

              <Button onClick={() => setShowFilesDialog(true)} variant="outline" size="sm" title="Open saved files">
                <FolderOpen className="w-4 h-4 mr-2" />
                Files ({savedFiles.length})
              </Button>

              <Button onClick={clearConsole} variant="outline" size="sm">
                Clear Console
              </Button>

              <Button onClick={resetCode} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 p-0">
          <div className="flex-1">
            <Editor
              height="300px"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="border-t border-neutral-200">
            <div className="p-4">
              <h4 className="text-sm font-medium mb-2">Console Output</h4>
              <ScrollArea className="h-32 w-full rounded border bg-black text-green-400 p-2 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{output}</pre>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save File Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save File</DialogTitle>
            <DialogDescription>
              Save your code for later. You can download or reload it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter file name (e.g., my_script)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveFile()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFile}>Save File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Files List Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Saved Files</DialogTitle>
            <DialogDescription>
              Manage your saved practice files
            </DialogDescription>
          </DialogHeader>

          {savedFiles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-500">No saved files yet. Save your first file to get started!</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {savedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      <p className="text-sm text-neutral-500">
                        {file.language} • {FileManager.formatDate(file.lastModified)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadFile(file)}
                        title="Load this file"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(file)}
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteFile(file.id, file.name)}
                        title="Delete file"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
