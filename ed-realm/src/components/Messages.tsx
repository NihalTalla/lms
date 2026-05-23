import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Send, Paperclip, Search, Plus, CheckCircle2, Clock, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';

export function Messages() {
  const { currentUser } = useAuth();
  const [selectedThread, setSelectedThread] = useState<number>(0);
  const [messageInput, setMessageInput] = useState('');
  const [newQuestionDialogOpen, setNewQuestionDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      toast.success(`Attached ${e.target.files[0].name}`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const conversations: any[] = [];

  const currentConversation = conversations[selectedThread] ?? {
    id: 0,
    student: { name: 'No conversation selected', avatar: '', status: 'offline' },
    lastMessage: '',
    lastMessageTime: '',
    unread: 0,
    messages: [],
  };

  const handleSendMessage = () => {
    if (messageInput.trim() || attachment) {
      toast.success('Message sent successfully');
      setMessageInput('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast.error('Please enter a message or attach a file');
    }
  };

  // WhatsApp-style UI for faculty
  if (currentUser?.role === 'faculty' || currentUser?.role === 'admin') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2>Messages</h2>
          <p className="text-neutral-600 mt-1">
            Chat with students and answer their questions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-200px)] border border-neutral-200 rounded-lg overflow-hidden bg-white">
          {/* Conversations List - WhatsApp Style */}
          <div className="lg:col-span-1 border-r border-neutral-200 flex flex-col">
            {/* Search Header */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              <div className="divide-y divide-neutral-100">
                {conversations.map((conv, index) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedThread(index)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-neutral-50 ${selectedThread === index ? 'bg-purple-50' : ''
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback
                            style={{
                              backgroundColor: selectedThread === index ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                              color: selectedThread === index ? 'white' : 'var(--color-neutral-700)'
                            }}
                          >
                            {conv.student.avatar}
                          </AvatarFallback>
                        </Avatar>
                        {conv.student.status === 'online' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">{conv.student.name}</h4>
                          <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                            {conv.lastMessageTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-neutral-600 line-clamp-1 flex-1">
                            {conv.lastMessage}
                          </p>
                          {conv.unread > 0 && (
                            <Badge
                              className="ml-2 flex-shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area - WhatsApp Style */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    {currentConversation.student.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{currentConversation.student.name}</h4>
                  <p className="text-xs text-neutral-600">
                    {currentConversation.student.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" style={{ background: 'linear-gradient(to bottom, #f9fafb, #ffffff)' }}>
              <div className="space-y-3">
                {currentConversation.messages.map((message: any) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${message.isMe
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-white border border-neutral-200 text-neutral-900 rounded-bl-none'
                        }`}
                    >
                      {!message.isMe && (
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-primary)' }}>
                          {message.sender}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${message.isMe ? 'text-purple-200' : 'text-neutral-500'
                        }`}>
                        <span className="text-xs">{message.timestamp}</span>
                        {message.isMe && (
                          message.read ?
                            <CheckCheck className="w-3 h-3" /> :
                            <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
              {attachment && (
                <div className="mb-2 flex items-center gap-2 text-sm text-neutral-600 border border-neutral-200 bg-white shadow-xs p-2 rounded-md w-fit">
                  <Paperclip className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="text-neutral-400 hover:text-red-500 transition-colors ml-2 font-bold px-1">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                <Button variant="outline" size="icon" className="flex-shrink-0" onClick={triggerFileInput}>
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const threads: any[] = [];

  const currentThread = threads[selectedThread] ?? {
    id: 0,
    title: 'No thread selected',
    student: '-',
    faculty: '',
    status: 'open',
    messages: [],
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}><Clock className="w-3 h-3 mr-1" />Open</Badge>;
      case 'answered':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Answered</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Q&A Messages</h2>
          <p className="text-neutral-600 mt-1">
            Ask questions and get help from instructors
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Thread List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-80px)]">
            <CardContent className="space-y-2 pb-4">
              {threads.map((thread, index) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(index)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedThread === index
                    ? 'bg-purple-50 border-purple-200'
                    : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm line-clamp-1">{thread.title}</h4>
                    {thread.unread > 0 && (
                      <Badge className="ml-2" style={{ backgroundColor: 'var(--color-danger)' }}>
                        {thread.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2 mb-2">
                    {thread.lastMessage}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">{thread.lastMessageTime}</span>
                    {getStatusBadge(thread.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Conversation */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{currentThread.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '10px' }}>
                        {currentThread.student.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span>Student: {currentThread.student}</span>
                  </div>
                  {currentThread.faculty && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback style={{ backgroundColor: 'var(--color-secondary)', color: 'white', fontSize: '10px' }}>
                          {currentThread.faculty.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>Instructor: {currentThread.faculty}</span>
                    </div>
                  )}
                </div>
              </div>
              {getStatusBadge(currentThread.status)}
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {currentThread.messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isMe ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback style={{
                      backgroundColor: message.isMe ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                      color: message.isMe ? 'white' : 'var(--color-neutral-700)'
                    }}>
                      {message.sender.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${message.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm">{message.sender}</span>
                      <span className="text-xs text-neutral-500">{message.timestamp}</span>
                    </div>
                    <div
                      className={`p-3 rounded-lg max-w-[80%] ${message.isMe
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-neutral-100 text-neutral-900'
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <CardContent className="border-t pt-4">
            {attachment && (
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-600 border border-neutral-200 bg-white shadow-xs p-2 rounded-md w-fit">
                <Paperclip className="w-4 h-4 text-purple-600" />
                <span className="font-medium">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-neutral-400 hover:text-red-500 transition-colors ml-2 font-bold px-1">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <Button variant="outline" size="icon" onClick={triggerFileInput}>
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} style={{ backgroundColor: 'var(--color-primary)' }}>
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Question Dialog */}
      <Dialog open={newQuestionDialogOpen} onOpenChange={setNewQuestionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ask a New Question</DialogTitle>
            <DialogDescription>
              Post your question and an instructor will respond
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Title</Label>
              <Input
                placeholder="e.g., Help with Two-Pointer Approach"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Question Details</Label>
              <Textarea
                placeholder="Describe your question in detail..."
                rows={4}
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onClick={() => {
                  if (!newQuestion.title || !newQuestion.content) {
                    toast.error('Please fill all fields');
                    return;
                  }
                  toast.success('Question posted successfully! An instructor will respond soon.');
                  setNewQuestionDialogOpen(false);
                  setNewQuestion({ title: '', content: '' });
                }}
              >
                Post Question
              </Button>
              <Button variant="outline" onClick={() => setNewQuestionDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
