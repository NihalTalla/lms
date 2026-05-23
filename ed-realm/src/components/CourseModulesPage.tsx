import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Lock, Unlock, ArrowLeft, Play, BookOpen, CheckCircle2, Code } from 'lucide-react';
import { Course, Topic } from '../lib/data';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

interface CourseModulesPageProps {
  course: Course;
  onNavigate: (page: string, data?: any) => void;
  userRole: 'faculty' | 'trainer' | 'student';
  canLock?: boolean;
}

const CodeKeywordTags = ({ text }: { text: string }) => {
  const keywords = ['if', 'if-else', 'for', 'while', 'switch-case', 'break', 'continue', 'return', 'function', 'class', 'const', 'let', 'var', 'async', 'await'];
  const parts = text.split(/(\b(?:if|if-else|for|while|switch-case|break|continue|return|function|class|const|let|var|async|await)\b)/gi);

  return (
    <p className="text-neutral-700 leading-relaxed">
      {parts.map((part, idx) => {
        const isKeyword = keywords.some(kw => kw.toLowerCase() === part?.toLowerCase());
        if (isKeyword) {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 rounded text-sm font-mono"
              style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)', color: 'var(--color-primary)' }}
            >
              {part}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </p>
  );
};

export function CourseModulesPage({ course, onNavigate, userRole, canLock = false }: CourseModulesPageProps) {
  const [modules, setModules] = useState<Topic[]>(course.topics || []);
  const [selectedModuleForContent, setSelectedModuleForContent] = useState<Topic | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);

  const handleToggleLock = (moduleId: string) => {
    const updatedModules = modules.map(m =>
      m.id === moduleId ? { ...m, isLocked: !m.isLocked } : m
    );
    setModules(updatedModules);
    const module = updatedModules.find(m => m.id === moduleId);
    toast.success(`Module ${module?.isLocked ? 'locked' : 'unlocked'}`);
  };

  const handleViewContent = (module: Topic) => {
    setSelectedModuleForContent(module);
    setIsContentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('courses')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">{course.title}</h2>
          <p className="text-neutral-600 mt-1">{course.description}</p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="space-y-4">
        {modules.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-neutral-600">No modules available in this course</p>
          </Card>
        ) : (
          modules.map((module, idx) => (
            <Card
              key={module.id}
              className="shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-400"
              onClick={() => onNavigate('student-module', { course, module })}
            >
              <CardContent className="p-6 space-y-4">
                {/* Top Row: Title and Badge */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-neutral-900">{module.title}</h3>
                  <Badge
                    className="rounded-full px-3 py-1 gap-1.5 flex items-center"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: 'none',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </Badge>
                </div>

                {/* Second Row: Module Info and Progress Bar */}
                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">
                    Module {idx + 1} • {course.duration} • 100% complete
                  </p>
                  <Progress value={100} className="h-1" style={{ backgroundColor: 'rgba(107, 114, 128, 0.2)' }} />
                  <div className="h-1 rounded-full bg-orange-400" style={{ width: '100%' }} />
                </div>

                {/* Description with Code Keywords */}
                <div>
                  <CodeKeywordTags text={module.content} />
                </div>

                {/* Bottom Row: Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleViewContent(module)}
                    className="rounded-full gap-2 px-4"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: 'none',
                    }}
                    variant="outline"
                  >
                    <BookOpen className="w-4 h-4" />
                    Content - {module.questions?.length || 0}
                  </Button>

                  <Button
                    size="sm"
                    className="rounded-full gap-2 px-4"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: 'none',
                    }}
                    variant="outline"
                    onClick={() => {
                      // Open the first assignment question directly in the coding view
                      const first = module.questions && module.questions.length > 0 ? module.questions[0] : null;
                      if (first) {
                        onNavigate('coding-challenge-ui', {
                          topicTitle: module.title,
                          difficulty: 'Medium',
                          problemDescription: module.content,
                          examples: [
                            { id: 'ex-1', input: 'n = 100', output: '2,4,8,14,22,32,44,58,74,92' }
                          ],
                          testCases: [
                            { id: 'tc-1', input: '100', expectedOutput: '2,4,8,14,22,32,44,58,74,92', hidden: false }
                          ],
                          previousData: { course, module }
                        });
                      } else {
                        toast.info('No assignments available for this module');
                      }
                    }}
                  >
                    <Code className="w-4 h-4" />
                    Assignment - {module.questions?.length || 0}
                  </Button>

                  {canLock && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto gap-2"
                      onClick={() => handleToggleLock(module.id)}
                    >
                      {module.isLocked ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          Unlocked
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Content Dialog */}
      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedModuleForContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="text-neutral-700 whitespace-pre-wrap">
              {selectedModuleForContent?.content}
            </div>
            {selectedModuleForContent?.images && selectedModuleForContent.images.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-neutral-900">Images</h4>
                {selectedModuleForContent.images.map((img, idx) => (
                  <img key={idx} src={img} alt={`Module ${idx}`} className="max-w-full rounded" />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
