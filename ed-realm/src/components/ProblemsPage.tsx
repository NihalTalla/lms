import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, FileText, Star, CheckCircle2, Trophy } from 'lucide-react';
import api from '../lib/api';
import type { Problem } from '../lib/data';

interface ProblemsPageProps {
  onSelectProblem: (problem: Problem) => void;
}

interface TopicStat {
  name: string;
  total: number;
}

interface CategoryDefinition {
  id: string;
  name: string;
  tags: string[];
}

const ORDERED_TOPICS = [
  'Array', 'String', 'Hash Table', 'Depth-First Search', 'Dynamic Programming',
  'Sorting', 'Breadth-First Search', 'Math', 'Two Pointers', 'Tree',
  'Matrix', 'Binary Search', 'Binary Tree', 'Greedy', 'Stack', 'Design',
  'Heap (Priority Queue)', 'Linked List', 'Sliding Window', 'Backtracking',
  'Bit Manipulation', 'Union Find', 'Prefix Sum', 'Counting', 'Graph Theory',
  'Simulation', 'Binary Search Tree', 'Recursion', 'Divide and Conquer', 'Trie',
  'Queue', 'Topological Sort', 'Monotonic Stack', 'Graph', 'Interactive',
  'Data Stream', 'Hash Function', 'Memoization', 'Shortest Path', 'String Matching',
  'Bitmask DP', 'Enumeration', 'Ordered Set', 'Combinatorics', 'Counting Sort',
  'Doubly-Linked List', 'Game Theory', 'Iterator', 'Monotonic Queue', 'Number Theory',
  'Quickselect', 'Sweep Line', 'Bucket Sort', 'Merge Sort', 'Minimum Spanning Tree',
  'Randomized', 'Binary Indexed Tree', 'Eulerian Circuit', 'Geometry',
  'Probability and Statistics', 'Radix Sort', 'Rolling Hash', 'Segment Tree',
  'Strongly Connected Component',
];

const CATEGORIES: CategoryDefinition[] = [
  { id: 'arrays-hashing', name: 'Arrays & Hashing', tags: ['Array', 'Hash Table'] },
  { id: 'two-pointers', name: 'Two Pointers', tags: ['Two Pointers'] },
  { id: 'sliding-window', name: 'Sliding Window', tags: ['Sliding Window'] },
  { id: 'stack', name: 'Stack', tags: ['Stack', 'Monotonic Stack'] },
  { id: 'binary-search', name: 'Binary Search', tags: ['Binary Search'] },
  { id: 'linked-list', name: 'Linked List', tags: ['Linked List', 'Doubly-Linked List'] },
  { id: 'trees', name: 'Trees', tags: ['Tree', 'Binary Tree', 'Binary Search Tree'] },
  { id: 'heap', name: 'Heap / Priority Queue', tags: ['Heap (Priority Queue)'] },
  { id: 'backtracking', name: 'Backtracking', tags: ['Backtracking'] },
  { id: 'tries', name: 'Tries', tags: ['Trie'] },
  { id: 'graphs', name: 'Graphs', tags: ['Graph', 'Graph Theory', 'Minimum Spanning Tree', 'Shortest Path'] },
];

export function ProblemsPage({ onSelectProblem }: ProblemsPageProps) {
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [starredProblems, setStarredProblems] = useState<Set<string>>(new Set());

  const [problemsList, setProblemsList] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const solvedProblems = useMemo(() => new Set(['problem-1', 'problem-2']), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api.getProblems()
      .then((res: any) => {
        if (!mounted) return;
        setProblemsList(Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const topicStats = useMemo<TopicStat[]>(() => {
    const tagCounts = new Map<string, number>();
    problemsList.forEach(problem => {
      (problem.tags || []).forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    const ordered = ORDERED_TOPICS.filter(tag => tagCounts.has(tag));
    const extra = Array.from(tagCounts.keys()).filter(tag => !ORDERED_TOPICS.includes(tag));
    return [...ordered, ...extra]
      .map(tag => ({ name: tag, total: tagCounts.get(tag) || 0 }))
      .filter(stat => stat.total > 0);
  }, [problemsList]);

  const categoriesWithProblems = useMemo(() => {
    return CATEGORIES.map(category => {
      const categoryProblems = problemsList.filter(problem =>
        (problem.tags || []).some(tag => category.tags.includes(tag)),
      );
      const visibleProblems = selectedTopic
        ? categoryProblems.filter(problem => (problem.tags || []).includes(selectedTopic))
        : categoryProblems;
      const solvedCount = categoryProblems.filter(problem => solvedProblems.has(problem.id)).length;
      return {
        ...category,
        total: categoryProblems.length,
        solved: solvedCount,
        problems: visibleProblems,
      };
    }).filter(c => c.total > 0);
  }, [selectedTopic, solvedProblems, problemsList]);

  const visibleTopics = topicsExpanded ? topicStats : topicStats.slice(0, 10);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStarToggle = (e: React.MouseEvent, problemId: string) => {
    e.stopPropagation();
    setStarredProblems(prev => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  };

  const difficultyColor = (d: string) =>
    d === 'easy' ? '#059669' : d === 'medium' ? '#d97706' : '#dc2626';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100%', padding: '0px 0px 24px 0px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 4 }}>Practice Problems</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Master your coding skills by solving these curated challenges.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Solved
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {solvedProblems.size} / {problemsList.length}
            </div>
          </div>
          <div style={{ background: '#f3f4f6', padding: 12, borderRadius: '50%' }}>
            <Trophy size={20} style={{ color: '#111827' }} />
          </div>
        </div>
      </div>

      {/* ── Topics Panel ── */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 20,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 6, height: 20, background: '#3b82f6', borderRadius: 4, boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}></div>
            <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Topics Library
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSelectedTopic(null)}
              style={{
                background: selectedTopic ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: '1px solid',
                borderColor: selectedTopic ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                color: selectedTopic ? '#60a5fa' : '#475569',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '6px 16px',
                borderRadius: 12,
                cursor: selectedTopic ? 'pointer' : 'default',
                transition: 'all 0.2s',
                opacity: selectedTopic ? 1 : 0.4
              }}
              disabled={!selectedTopic}
            >
              Reset Filter
            </button>
            <button
              type="button"
              onClick={() => setTopicsExpanded(prev => !prev)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                color: '#ffffff', fontSize: 11, fontWeight: 800,
                padding: '6px 16px', borderRadius: 12, transition: 'all 0.2s',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              {topicsExpanded ? 'Collapse' : 'Expand'}
              <ChevronDown
                size={14}
                style={{ transition: 'transform 0.2s', transform: topicsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visibleTopics.map(topic => {
            const active = selectedTopic === topic.name;
            return (
              <button
                key={topic.name}
                type="button"
                onClick={() => setSelectedTopic(active ? null : topic.name)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  borderRadius: 12,
                  border: '1px solid',
                  borderColor: active ? '#3b82f6' : '#1e293b',
                  cursor: 'pointer',
                  background: active ? '#3b82f6' : 'rgba(30, 41, 59, 0.4)',
                  color: active ? '#ffffff' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.3s',
                }}
              >
                <span>{topic.name}</span>
                <span
                  style={{
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(30, 41, 59, 0.8)',
                    color: active ? '#ffffff' : '#64748b',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 8px',
                    minWidth: 24,
                    textAlign: 'center',
                    transition: 'all 0.3s'
                  }}
                >
                  {topic.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Loading problems…</div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>Failed to load problems: {error}</div>
        ) : categoriesWithProblems.length === 0 ? (
          <div
            style={{
              background: '#ffffff', borderRadius: 12, padding: '32px 20px',
              border: '1px solid #e5e7eb',
              textAlign: 'center', color: '#6b7280', fontSize: 14,
            }}
          >
            No topics match your current selection.
          </div>
        ) : (
          categoriesWithProblems.map(category => {
            const isOpen = expandedCategories.has(category.id);
            const progress = category.total ? (category.solved / category.total) * 100 : 0;

            return (
              <div
                key={category.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                {/* Row Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    width: '100%', padding: '16px 20px',
                    background: isOpen ? '#f9fafb' : '#ffffff',
                    border: 'none', cursor: 'pointer',
                    gap: 16, textAlign: 'left',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Chevron */}
                  <ChevronDown
                    size={18}
                    style={{
                      color: '#9ca3af',
                      flexShrink: 0,
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  />

                  {/* Category name */}
                  <span
                    style={{
                      flex: 1, fontWeight: 700,
                      fontSize: 15, color: '#111827',
                    }}
                  >
                    {category.name}
                  </span>

                  {/* Progress count */}
                  <span
                    style={{
                      color: '#6b7280', fontSize: 13,
                      fontWeight: 600, whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right',
                    }}
                  >
                    {category.solved} / {category.total}
                  </span>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: 200, flexShrink: 0,
                      height: 8, background: '#e5e7eb', borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`, height: '100%',
                        background: '#111827', borderRadius: 4,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </button>

                {/* Expanded Problem List */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #e5e7eb' }}>
                    {/* Table Header */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '36px 36px 1fr 90px 60px',
                        padding: '10px 20px',
                        background: '#f9fafb',
                        color: '#6b7280',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <span>✓</span>
                      <span>★</span>
                      <span>Problem</span>
                      <span>Difficulty</span>
                      <span style={{ textAlign: 'center' }}>Sol.</span>
                    </div>

                    {/* Rows */}
                    {category.problems.length === 0 ? (
                      <div style={{ padding: '20px', color: '#6b7280', textAlign: 'center', fontSize: 13 }}>
                        No problems in this topic.
                      </div>
                    ) : (
                      category.problems.map((problem, idx) => {
                        const isSolved = solvedProblems.has(problem.id);
                        const isStarred = starredProblems.has(problem.id);
                        return (
                          <div
                            key={problem.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '36px 36px 1fr 90px 60px',
                              alignItems: 'center',
                              padding: '12px 20px',
                              borderBottom: idx === category.problems.length - 1 ? 'none' : '1px solid #f3f4f6',
                              background: '#ffffff',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                          >
                            {/* Solved */}
                            <span>
                              <CheckCircle2
                                size={18}
                                style={{ color: isSolved ? '#059669' : '#d1d5db' }}
                              />
                            </span>

                            {/* Star */}
                            <button
                              type="button"
                              onClick={e => handleStarToggle(e, problem.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                              aria-label={isStarred ? 'Remove star' : 'Star problem'}
                            >
                              <Star
                                size={18}
                                style={{
                                  color: isStarred ? '#f59e0b' : '#d1d5db',
                                  fill: isStarred ? '#f59e0b' : 'none',
                                  transition: 'color 0.15s',
                                }}
                              />
                            </button>

                            {/* Title */}
                            <button
                              type="button"
                              onClick={() => onSelectProblem(problem)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                color: '#111827', fontWeight: 500, fontSize: 14,
                                textAlign: 'left', padding: 0,
                              }}
                            >
                              {problem.title}
                              <ExternalLink size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            </button>

                            {/* Difficulty */}
                            <span
                              style={{
                                fontSize: 13, fontWeight: 600,
                                color: difficultyColor(problem.difficulty),
                                textTransform: 'capitalize',
                              }}
                            >
                              {problem.difficulty}
                            </span>

                            {/* Solution */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                aria-label="View solution"
                              >
                                <FileText size={18} style={{ color: '#9ca3af' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
