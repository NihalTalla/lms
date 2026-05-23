import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Question, Answer, User } from '../lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, MessageSquare, ThumbsUp, Check, CheckCircle, Clock, User as UserIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const questionsStorageKey = (courseId: string) => `course_qa_questions_${courseId}`;
const answersStorageKey = (courseId: string) => `course_qa_answers_${courseId}`;

export function CourseQA() {
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '', isAnonymous: false });
  const [newAnswer, setNewAnswer] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Load persisted course-specific QA data.
  useEffect(() => {
    if (!courseId || typeof window === 'undefined') return;

    try {
      const rawQuestions = localStorage.getItem(questionsStorageKey(courseId));
      const rawAnswers = localStorage.getItem(answersStorageKey(courseId));

      const parsedQuestions = rawQuestions ? JSON.parse(rawQuestions) : [];
      const parsedAnswers = rawAnswers ? JSON.parse(rawAnswers) : [];

      setQuestions(Array.isArray(parsedQuestions) ? parsedQuestions : []);
      setAnswers(Array.isArray(parsedAnswers) ? parsedAnswers : []);
    } catch {
      setQuestions([]);
      setAnswers([]);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId || typeof window === 'undefined') return;
    localStorage.setItem(questionsStorageKey(courseId), JSON.stringify(questions));
  }, [courseId, questions]);

  useEffect(() => {
    if (!courseId || typeof window === 'undefined') return;
    localStorage.setItem(answersStorageKey(courseId), JSON.stringify(answers));
  }, [courseId, answers]);

  const handleAskQuestion = () => {
    if (!newQuestion.title.trim() || !newQuestion.content.trim()) return;
    
    const question: Question = {
      id: `q${Date.now()}`,
      courseId: courseId!,
      title: newQuestion.title,
      content: newQuestion.content,
      authorId: currentUser!.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'unanswered',
      isAnonymous: newQuestion.isAnonymous,
      upvotes: 0,
      tags: []
    };
    
    setQuestions([question, ...questions]);
    setNewQuestion({ title: '', content: '', isAnonymous: false });
  };

  const handleSubmitAnswer = (questionId: string) => {
    if (!newAnswer[questionId]?.trim()) return;
    
    const answer: Answer = {
      id: `a${Date.now()}`,
      questionId,
      content: newAnswer[questionId],
      authorId: currentUser!.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAccepted: false,
      upvotes: 0
    };
    
    setAnswers([...answers, answer]);
    setNewAnswer({ ...newAnswer, [questionId]: '' });
    
    // Update question status if answered by faculty
    if (currentUser?.role === 'faculty') {
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, status: 'answered' } : q
      ));
    }
  };

  const handleVote = (type: 'question' | 'answer', id: string, isUpvote: boolean) => {
    if (type === 'question') {
      setQuestions(questions.map(q => 
        q.id === id ? { ...q, upvotes: q.upvotes + (isUpvote ? 1 : -1) } : q
      ));
    } else {
      setAnswers(answers.map(a => 
        a.id === id ? { ...a, upvotes: a.upvotes + (isUpvote ? 1 : -1) } : a
      ));
    }
  };

  const handleAcceptAnswer = (answerId: string, questionId: string) => {
    // Only the question author can accept an answer
    const question = questions.find(q => q.id === questionId);
    if (question?.authorId !== currentUser?.id) return;
    
    // Update all answers for this question
    setAnswers(answers.map(a => ({
      ...a,
      isAccepted: a.id === answerId
    })));
    
    // Update question status
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, status: 'resolved' } : q
    ));
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         question.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'unanswered') return matchesSearch && question.status === 'unanswered';
    if (activeTab === 'answered') return matchesSearch && question.status === 'answered';
    if (activeTab === 'resolved') return matchesSearch && question.status === 'resolved';
    
    return matchesSearch;
  });

  const getUserById = (userId: string): User | undefined => {
    if (currentUser?.id === userId) return currentUser as User;
    return undefined;
  };

  const getAnswersForQuestion = (questionId: string) => {
    return answers
      .filter(a => a.questionId === questionId)
      .sort((a, b) => {
        // Sort by accepted first, then by upvotes
        if (a.isAccepted) return -1;
        if (b.isAccepted) return 1;
        return b.upvotes - a.upvotes;
      });
  };

  if (selectedQuestion) {
    const questionAuthor = getUserById(selectedQuestion.authorId);
    const questionAnswers = getAnswersForQuestion(selectedQuestion.id);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedQuestion(null)}
          >
            ← Back to Questions
          </Button>
          <h2 className="text-2xl font-bold">{selectedQuestion.title}</h2>
        </div>
        
        {/* Question */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedQuestion.isAnonymous ? 'A' : questionAuthor?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedQuestion.isAnonymous ? 'Anonymous' : questionAuthor?.name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedQuestion.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge 
                variant={selectedQuestion.status === 'unanswered' ? 'secondary' : 'default'}
                className="capitalize"
              >
                {selectedQuestion.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{selectedQuestion.content}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1"
                onClick={() => handleVote('question', selectedQuestion.id, true)}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{selectedQuestion.upvotes}</span>
              </Button>
              {selectedQuestion.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Answers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {questionAnswers.length} {questionAnswers.length === 1 ? 'Answer' : 'Answers'}
            </h3>
          </div>
          
          {questionAnswers.length > 0 ? (
            questionAnswers.map(answer => {
              const answerAuthor = getUserById(answer.authorId);
              const isFaculty = answerAuthor?.role === 'faculty' || answerAuthor?.role === 'admin';
              
              return (
                <Card key={answer.id} className={answer.isAccepted ? 'border-green-200 bg-green-50' : ''}>
                  <CardHeader className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className={isFaculty ? 'ring-2 ring-primary' : ''}>
                            <AvatarFallback>
                              {answerAuthor?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {isFaculty && (
                            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {answerAuthor?.name || 'Unknown User'}
                            {isFaculty && (
                              <Badge variant="secondary" className="text-xs">
                                {answerAuthor.role === 'admin' ? 'Admin' : 'Faculty'}
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(answer.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {answer.isAccepted && (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Accepted Answer
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p>{answer.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => handleVote('answer', answer.id, true)}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{answer.upvotes}</span>
                      </Button>
                      
                      {/* Only show accept button for question author and if not already accepted */}
                      {selectedQuestion.authorId === currentUser?.id && !answers.some(a => a.isAccepted && a.questionId === selectedQuestion.id) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAcceptAnswer(answer.id, selectedQuestion.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept Answer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto w-8 h-8 mb-2" />
              <p>No answers yet. Be the first to answer!</p>
            </div>
          )}
          
          {/* Answer form */}
          {(currentUser?.role === 'student' || currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Write your answer here..."
                  className="min-h-[120px]"
                  value={newAnswer[selectedQuestion.id] || ''}
                  onChange={(e) => setNewAnswer({ ...newAnswer, [selectedQuestion.id]: e.target.value })}
                />
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => handleSubmitAnswer(selectedQuestion.id)}
                    disabled={!newAnswer[selectedQuestion.id]?.trim()}
                  >
                    Post Answer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Course Q&A</h2>
          <p className="text-muted-foreground">
            Ask questions and get help from instructors and peers
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">All Questions</TabsTrigger>
            <TabsTrigger value="unanswered">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Unanswered
              </div>
            </TabsTrigger>
            <TabsTrigger value="answered">Answered</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          
          {(currentUser?.role === 'student' || currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
            <Button 
              onClick={() => {
                setNewQuestion({ title: '', content: '', isAnonymous: false });
                const newQuestionElement = document.getElementById('new-question-form');
                if (newQuestionElement) {
                  newQuestionElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Ask Question
            </Button>
          )}
        </div>
        
        <TabsContent value={activeTab} className="space-y-4">
          {filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.map(question => {
                const questionAuthor = getUserById(question.authorId);
                const questionAnswers = answers.filter(a => a.questionId === question.id);
                const hasAcceptedAnswer = questionAnswers.some(a => a.isAccepted);
                
                return (
                  <Card 
                    key={question.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      hasAcceptedAnswer ? 'border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{question.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {question.content}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={question.status === 'unanswered' ? 'secondary' : 'default'}
                          className="capitalize"
                        >
                          {question.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{question.upvotes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{questionAnswers.length} answers</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {question.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {question.isAnonymous ? (
                              <>
                                <UserIcon className="w-4 h-4" />
                                <span>Anonymous</span>
                              </>
                            ) : (
                              <>
                                <Avatar className="w-5 h-5">
                                  <AvatarFallback>
                                    {questionAuthor?.name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{questionAuthor?.name || 'Unknown User'}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <MessageSquare className="mx-auto w-10 h-10 mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium">
                {searchTerm ? 'No questions match your search' : 'No questions yet'}
              </h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm 
                  ? 'Try adjusting your search or ask a new question.'
                  : 'Be the first to ask a question!'}
              </p>
              {!searchTerm && (currentUser?.role === 'student' || currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
                <Button className="mt-4" onClick={() => {
                  const newQuestionElement = document.getElementById('new-question-form');
                  if (newQuestionElement) {
                    newQuestionElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}>
                  Ask a Question
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* New Question Form */}
      {(currentUser?.role === 'student' || currentUser?.role === 'faculty' || currentUser?.role === 'admin') && (
        <Card id="new-question-form" className="mt-8">
          <CardHeader>
            <CardTitle>Ask a Question</CardTitle>
            <CardDescription>
              Be specific and imagine you're asking a question to another person
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="question-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="question-title"
                placeholder="What's your question? Be specific."
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="question-details" className="text-sm font-medium">
                Details
              </label>
              <Textarea
                id="question-details"
                placeholder="Include all the information someone would need to answer your question"
                className="min-h-[150px]"
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous-question"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={newQuestion.isAnonymous}
                  onChange={(e) => setNewQuestion({ ...newQuestion, isAnonymous: e.target.checked })}
                />
                <label htmlFor="anonymous-question" className="text-sm font-medium">
                  Post anonymously
                </label>
              </div>
              
              <Button 
                onClick={handleAskQuestion}
                disabled={!newQuestion.title.trim() || !newQuestion.content.trim()}
              >
                Post Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CourseQA;
