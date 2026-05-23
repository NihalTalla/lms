import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Play, RotateCcw, Copy, Trash2, ChevronRight, Terminal, Settings, Download, Monitor, Code2, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { toast } from 'sonner';

interface ProgramizCompilerProps {
    onBack?: () => void;
}

export function ProgramizCompiler({ onBack }: ProgramizCompilerProps) {
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(`def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Programiz")\n\n# Try writing some more code here\nfor i in range(5):\n    print(f"Count: {i}")`);
    const [output, setOutput] = useState('Click "Run" to see the output here...');
    const [isRunning, setIsRunning] = useState(false);
    const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');

    const templates: Record<string, string> = {
        python: `def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Programiz")\n\n# Try writing some more code here\nfor i in range(5):\n    print(f"Count: {i}")`,
        javascript: `function greet(name) {\n    console.log("Hello, " + name + "!");\n}\n\ngreet("Programiz");\n\n// Try writing some more code here\nfor (let i = 0; i < 5; i++) {\n    console.log("Count: " + i);\n}`,
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Programiz!" << endl;\n    for(int i=0; i<5; i++) {\n        cout << "Count: " << i << endl;\n    }\n    return 0;\n}`,
        java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Programiz!");\n        for(int i=0; i<5; i++) {\n            System.out.println("Count: " + i);\n        }\n    }\n}`,
    };

    useEffect(() => {
        setCode(templates[language] || '');
    }, [language]);

    const handleRun = async () => {
        setIsRunning(true);
        setOutput('Compiling and running...\n');

        // Simulate execution speed
        setTimeout(() => {
            let result = '';
            if (language === 'python') {
                result = 'Hello, Programiz!\nCount: 0\nCount: 1\nCount: 2\nCount: 3\nCount: 4\n\n[Execution Successful]';
            } else if (language === 'javascript') {
                result = 'Hello, Programiz!\nCount: 0\nCount: 1\nCount: 2\nCount: 3\nCount: 4\n\n[Execution Successful]';
            } else {
                result = `Execution simulated for ${language.toUpperCase()}.\nOutput: Hello, Programiz!\n\n[Execution Successful]`;
            }
            setOutput(result);
            setIsRunning(false);
            toast.success('Code executed successfully');
        }, 1000);
    };

    const handleClear = () => {
        setOutput('Click "Run" to see the output here...');
        toast.info('Output cleared');
    };

    const handleReset = () => {
        setCode(templates[language]);
        toast.info('Code reset to template');
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard');
    };

    return (
        <div className="flex flex-col w-full bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden mb-6">
            {/* Professional White Header Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-black hover:bg-neutral-50 font-bold border-neutral-300 shadow-sm h-9 px-4 active:scale-95"
                        onClick={onBack}
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <div className="h-6 w-px bg-neutral-200 mx-2" />

                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-600 rounded shadow-md">
                            <Code2 className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-sm font-black text-neutral-900 uppercase tracking-widest">
                            Code <span className="text-neutral-400">Sandbox</span>
                        </h2>
                    </div>

                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-40 bg-white border-neutral-300 text-neutral-900 font-bold text-xs h-9 shadow-sm hover:bg-neutral-50 transition-all uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-neutral-200 text-neutral-900 font-bold">
                            <SelectItem value="python">Python 3.10</SelectItem>
                            <SelectItem value="javascript">Node.js 18</SelectItem>
                            <SelectItem value="java">Java 17 (LTS)</SelectItem>
                            <SelectItem value="cpp">C++ 20 (GCC)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-black hover:bg-neutral-50 font-bold border-neutral-300 shadow-sm h-9 px-4"
                        onClick={copyToClipboard}
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-black hover:bg-neutral-50 font-bold border-neutral-300 shadow-sm h-9 px-4"
                        onClick={handleReset}
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="bg-[#238636] hover:bg-[#2ea043] text-white font-black px-6 h-9 shadow-md transition-all active:scale-95 flex items-center border-none rounded-md"
                        style={{ backgroundColor: '#238636', color: 'white' }}
                    >
                        {isRunning ? (
                            <>
                                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2 fill-white" />
                                Run Code
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col bg-white">
                {/* File Explorer Tab Bar */}
                <div className="flex items-center justify-between px-6 py-2 bg-[#f8f9fa] border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-600 uppercase tracking-wider bg-white px-4 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                            <span>main.{language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language}</span>
                        </div>
                    </div>
                </div>

                {/* The Editor Area - Fixed pixels to ensure it never collapses */}
                <div className="h-[450px] relative border-b border-neutral-200 overflow-hidden">
                    <Editor
                        height="450px"
                        language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : language === 'cpp' ? 'cpp' : 'java'}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        theme={theme}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 16,
                            lineNumbers: 'on',
                            roundedSelection: true,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 20 },
                            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                            lineHeight: 26,
                            cursorBlinking: 'smooth',
                        }}
                    />
                </div>

                {/* Terminal / Console Area - Space-optimized */}
                <div className="min-h-[200px] flex flex-col bg-white">
                    <div className="flex items-center justify-between px-6 py-2.5 bg-[#f8f9fa] border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                            <Terminal className="w-4 h-4 text-blue-600" />
                            <span className="text-[10px] font-black text-neutral-900 uppercase tracking-[0.2em]">Console Output</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-[9px] text-green-700 font-bold border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                ONLINE
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-neutral-500 hover:text-neutral-900 font-bold text-[10px] uppercase flex items-center gap-1"
                                onClick={handleClear}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear Console
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 px-8 py-5 font-mono text-sm leading-relaxed overflow-y-auto bg-white min-h-[150px]">
                        <div className={`whitespace-pre-wrap ${isRunning ? 'text-blue-600 italic' : 'text-neutral-800'}`}>
                            {output}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
