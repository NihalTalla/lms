import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  Code2,
  BookOpen,
  Play,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { EdRealmLogo } from './EdRealmLogo';

interface Topic {
  id: string;
  title: string;
  duration: string;
  status: 'completed' | 'in-progress' | 'pending';
  content?: string;
  questions?: number;
}

interface TopicDetailsPageProps {
  assignmentTitle: string;
  moduleName: string;
  courseName: string;
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onStartCoding: (topicId: string) => void;
  onBack: () => void;
}

export function TopicDetailsPage({
  assignmentTitle,
  moduleName,
  courseName,
  selectedTopicId,
  onSelectTopic,
  onStartCoding,
  onBack,
}: TopicDetailsPageProps) {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    topics: true,
  });
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  // Mock topics data
  const topics: Topic[] = [
    {
      id: 'topic-1',
      title: 'Series – Level 1',
      duration: '15m',
      status: 'completed',
      content:
        'Introduction to series and sequences. Learn the basics of arithmetic and geometric series.',
      questions: 3,
    },
    {
      id: 'topic-2',
      title: 'Series – Level 2',
      duration: '25m',
      status: 'completed',
      content:
        'Advanced series problems. Complex patterns and sum formulas. Solve real-world applications.',
      questions: 2,
    },
    {
      id: 'topic-3',
      title: 'Series – Level 3',
      duration: '30m',
      status: 'pending',
      content: 'Expert level series challenges. Infinite series, convergence, and advanced techniques.',
      questions: 3,
    },
  ];

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];
  const totalProgress =
    (topics.filter((t) => t.status === 'completed').length / topics.length) * 100;
  const totalDuration = topics.reduce(
    (sum, t) => sum + parseInt(t.duration),
    0
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleTopicSelect = (topicId: string) => {
    onSelectTopic(topicId);
    toast.info(`Switched to: ${topics.find((t) => t.id === topicId)?.title}`);
  };

  const handleStartCoding = () => {
    onStartCoding(selectedTopicId);
  };

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* LEFT SIDEBAR - Topic Navigation */}
      <div className={`${sidebarMinimized ? 'w-24' : 'w-72'} bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border-r border-neutral-700 flex flex-col transition-all duration-300 ease-in-out overflow-y-auto`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-neutral-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              className="text-neutral-400 hover:text-white p-0 h-auto"
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${sidebarMinimized ? '' : 'rotate-180'}`} />
            </Button>
            {!sidebarMinimized && (
              <div className="bg-white rounded-md px-2 py-1">
                <EdRealmLogo size="small" />
              </div>
            )}
          </div>
          {!sidebarMinimized && (
            <>
              <h2 className="text-white font-bold text-sm mb-4 truncate">
                {assignmentTitle}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400">{topics.length} Topics</span>
                  <span className="text-xs font-bold text-orange-400">
                    {Math.round(totalProgress)}%
                  </span>
                </div>
                <Progress value={totalProgress} className="h-1 bg-neutral-700" />
              </div>
            </>
          )}
        </div>

        {/* Sidebar Menu Items */}
        {!sidebarMinimized && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicSelect(topic.id)}
                className={`w-full flex items-start gap-2 p-3 rounded-lg transition-all group ${
                  selectedTopicId === topic.id
                    ? 'bg-orange-500/20 border border-orange-500/40'
                    : 'hover:bg-neutral-700/30'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {topic.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border 2 border-neutral-500" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-xs font-semibold truncate ${selectedTopicId === topic.id ? 'text-orange-400' : 'text-neutral-300'}`}>
                    {topic.title}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1">{topic.duration}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-white text-neutral-900">
        <div className="p-8 w-full text-neutral-900">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              className="text-neutral-500 hover:text-neutral-900 mb-6 p-0 h-auto font-medium transition-colors"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignment
            </Button>

            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-neutral-900">
                    {selectedTopic.title}
                  </h1>
                  <Badge
                    className={`rounded-full px-3 py-1 ${selectedTopic.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}
                  >
                    {selectedTopic.status === 'completed' ? '✓ Completed' : 'In Progress'}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  Module: <span className="font-semibold">{moduleName}</span> • Course:{' '}
                  <span className="font-semibold">{courseName}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Topic Content */}
          <Card className="mb-8 shadow-sm border-neutral-200">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Title Section */}
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                    Problem Statement
                  </h2>
                  <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTopic.content ||
                      'No content available for this topic.'}
                  </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Code2 className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-xs text-neutral-600 font-medium">Total Questions</p>
                          <p className="text-2xl font-bold text-neutral-900">
                            {selectedTopic.questions}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="text-xs text-neutral-600 font-medium">Estimated Time</p>
                          <p className="text-2xl font-bold text-neutral-900">
                            {selectedTopic.duration}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Learning Objectives */}
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-3">Learning Objectives</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 text-neutral-700">
                      <BookOpen className="w-4 h-4 mt-1 text-orange-500 flex-shrink-0" />
                      <span>Understand fundamental concepts and principles</span>
                    </li>
                    <li className="flex items-start gap-3 text-neutral-700">
                      <BookOpen className="w-4 h-4 mt-1 text-orange-500 flex-shrink-0" />
                      <span>Apply techniques to solve real-world problems</span>
                    </li>
                    <li className="flex items-start gap-3 text-neutral-700">
                      <BookOpen className="w-4 h-4 mt-1 text-orange-500 flex-shrink-0" />
                      <span>Master advanced algorithms and patterns</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end mb-12">
            <Button
              variant="outline"
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            >
              View Resources
            </Button>
            <Button
              className="rounded-lg px-6 gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleStartCoding}
            >
              <Play className="w-4 h-4" />
              Start Coding Challenge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
