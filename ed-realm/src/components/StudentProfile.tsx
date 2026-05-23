import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  User,
  Users,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  FileText,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Upload,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ResumeBuilder } from './ResumeBuilder';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';

interface StudentProfileProps {
  onNavigate: (page: string, data?: any) => void;
}

export function StudentProfile({ onNavigate }: StudentProfileProps) {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('personal-info');

  const [projects, setProjects] = useState<{ id: number, title: string, description: string, isActive: boolean, tags: string[] }[]>([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', tags: '', isActive: false });

  const [trainers] = useState<{ id: number; name: string; role: string; subject: string }[]>([]);
  const [trainerFeedback, setTrainerFeedback] = useState<{ [key: number]: { comment: string, rating?: number } }>({});

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.error('Project title is required');
      return;
    }
    const tagsArray = newProject.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    setProjects([
      ...projects,
      {
        id: Date.now(),
        title: newProject.title,
        description: newProject.description,
        isActive: newProject.isActive,
        tags: tagsArray
      }
    ]);
    setNewProject({ title: '', description: '', tags: '', isActive: false });
    setIsAddingProject(false);
    toast.success('Project added successfully');
  };

  const handleFeedbackSubmit = (trainerId: number) => {
    const feedback = trainerFeedback[trainerId];
    if (!feedback?.rating) {
      toast.error('Please select a star rating for the trainer.');
      return;
    }
    if (!feedback?.comment?.trim()) {
      toast.error('Please enter your written feedback.');
      return;
    }
    const trainerName = trainers.find(t => t.id === trainerId)?.name;
    toast.success(`Feedback submitted successfully to ${trainerName}`);
    setTrainerFeedback({
      ...trainerFeedback,
      [trainerId]: { comment: '', rating: 0 }
    });
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    introductionVideo: '',
    careerObjective: '',
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [socialProfiles, setSocialProfiles] = useState({
    hackerrank: '',
    leetcode: '',
    codechef: '',
    hackerearth: '',
    linkedin: '',
    github: '',
    instagram: '',
  });

  const menuItems = [
    { id: 'personal-info', label: 'Personal Info', icon: User },
    { id: 'parent-info', label: 'Parent Info', icon: Users },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'academic-work', label: 'Academic Work', icon: TrendingUp },
    { id: 'social-profiles', label: 'Social Profiles', icon: CheckCircle2 },
    { id: 'view-resume', label: 'View Resume', icon: FileText },
    { id: 'trainer-feedback', label: 'Trainer Feedback', icon: MessageSquare },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSocialProfileChange = (platform: string, value: string) => {
    setSocialProfiles({ ...socialProfiles, [platform]: value });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };



  const renderContent = () => {
    switch (activeSection) {
      case 'personal-info':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5" style={{ color: '#FF6B35' }} />
              <h3 className="text-xl font-semibold">Personal Info</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      placeholder="e.g. John"
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      placeholder="e.g. Doe"
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. student@university.edu"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2 mt-1">
                    <select className="px-3 py-2 border border-neutral-200 rounded-md bg-white">
                      <option>+91</option>
                      <option>+1</option>
                    </select>
                    <Input
                      id="phone"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <div className="relative mt-1">
                    <Input
                      id="dateOfBirth"
                      placeholder="e.g. 01/01/2000"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="e.g. 123 College Street, City"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="introductionVideo">Introduction Video</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="px-3 py-2 border border-neutral-200 rounded-l-md bg-neutral-50 text-neutral-600">
                      http://
                    </div>
                    <Input
                      id="introductionVideo"
                      placeholder="www.youtube.com/watch?v=..."
                      value={formData.introductionVideo}
                      onChange={(e) => handleInputChange('introductionVideo', e.target.value)}
                      className="flex-1 rounded-l-none"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="careerObjective">Career Objective</Label>
                  <Textarea
                    id="careerObjective"
                    value={formData.careerObjective}
                    onChange={(e) => handleInputChange('careerObjective', e.target.value)}
                    className="mt-1"
                    rows={4}
                    placeholder="Write a short summary of your career goals."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative" style={{ backgroundColor: '#7C3AED' }}>
                    {profileImage ? (
                      <div className="w-full h-full flex items-center justify-center bg-white p-1">
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-md" />
                      </div>
                    ) : (
                      <Avatar className="w-32 h-32">
                        <AvatarFallback className="text-6xl text-white" style={{ backgroundColor: '#7C3AED' }}>
                          {currentUser?.name.split(' ').map(n => n[0]).join('') || 'T'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />

                  <Button variant="outline" className="w-full" onClick={handleTriggerUpload}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload a new Photo
                  </Button>

                  <p className="text-xs text-neutral-500 mt-2">800 * 800px recommended</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button style={{ backgroundColor: '#000' }}>
                Next
              </Button>
            </div>
          </div>
        );

      case 'social-profiles':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#FF6B35' }} />
              <h3 className="text-xl font-semibold">Social Profiles</h3>
            </div>

            <div className="space-y-4">
              {[
                { key: 'hackerrank', label: 'HackerRank', icon: 'H', bgColor: 'bg-green-600', textColor: 'text-white' },
                { key: 'leetcode', label: 'LeetCode', icon: 'L', bgColor: 'bg-orange-500', textColor: 'text-white' },
                { key: 'codechef', label: 'CodeChef', icon: '👨‍🍳', bgColor: 'bg-black', textColor: 'text-white' },
                { key: 'hackerearth', label: 'HackerEarth', icon: 'h', bgColor: 'bg-black', textColor: 'text-white' },
                { key: 'linkedin', label: 'LinkedIn', icon: 'in', bgColor: 'bg-blue-600', textColor: 'text-white' },
                { key: 'github', label: 'Github', icon: '🐙', bgColor: 'bg-black', textColor: 'text-white' },
                { key: 'instagram', label: 'Instagram', icon: '📷', bgColor: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500', textColor: 'text-white' },
              ].map((platform) => (
                <div key={platform.key} className="flex items-center gap-4 p-4 border border-neutral-200 rounded-lg">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${platform.bgColor} ${platform.textColor} flex-shrink-0`}>
                    <span className="font-bold text-lg">{platform.icon}</span>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block">{platform.label}</Label>
                    <div className="flex gap-0">
                      <div className="px-3 py-2 border border-neutral-200 border-r-0 rounded-l-md bg-neutral-50 text-neutral-600 text-sm flex items-center">
                        https://
                      </div>
                      <Input
                        placeholder="username"
                        value={socialProfiles[platform.key as keyof typeof socialProfiles]}
                        onChange={(e) => handleSocialProfileChange(platform.key, e.target.value)}
                        className="flex-1 rounded-l-none border-l-0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <Button style={{ backgroundColor: '#000', color: 'white' }}>
                Save Changes
              </Button>
            </div>
          </div>
        );

      case 'parent-info':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5" style={{ color: '#FF6B35' }} />
              <h3 className="text-xl font-semibold">Parent Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Father's Name</Label>
                <Input placeholder="Father's Name" />
              </div>
              <div className="space-y-2">
                <Label>Mother's Name</Label>
                <Input placeholder="Mother's Name" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input placeholder="Parent Contact" />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input placeholder="Occupation" />
              </div>
            </div>
          </div>
        );

      case 'education':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5" style={{ color: '#FF6B35' }} />
              <h3 className="text-xl font-semibold">Education</h3>
            </div>
            <div className="space-y-6">
              <div className="p-4 border border-neutral-100 bg-neutral-50/30 rounded-xl space-y-4">
                <h4 className="font-bold text-neutral-800">Undergraduate</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Degree (e.g. B.Tech CS)" />
                  <Input placeholder="University (e.g. CMR Technical Campus)" />
                  <Input placeholder="Year of Completion (e.g. 2027)" />
                  <Input placeholder="GPA/Percentage (e.g. 8.5)" />
                </div>
              </div>
              <div className="p-4 border border-neutral-100 bg-neutral-50/30 rounded-xl space-y-4">
                <h4 className="font-bold text-neutral-800">Higher Secondary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Stream (e.g. MPC)" />
                  <Input placeholder="Institution" />
                  <Input placeholder="Year" />
                  <Input placeholder="Percentage" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'academic-work':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5" style={{ color: '#FF6B35' }} />
              <h3 className="text-xl font-semibold">Academic Work</h3>
            </div>
            <div className="space-y-4">
              {projects.map(project => (
                <Card key={project.id} className="border-neutral-100">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-neutral-900">{project.title}</h4>
                      {project.isActive && (
                        <Badge className="bg-orange-100 text-orange-600 border-none">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 mb-4">{project.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {project.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {isAddingProject ? (
                <Card className="border-dashed border-2 border-neutral-200">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold">Add New Project</h4>
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingProject(false)}>Cancel</Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Project Title <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g. E-commerce Website"
                        value={newProject.title}
                        onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Briefly describe your project..."
                        value={newProject.description}
                        onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Skills/Tags (comma separated)</Label>
                      <Input
                        placeholder="e.g. React, Node.js, MongoDB"
                        value={newProject.tags}
                        onChange={e => setNewProject({ ...newProject, tags: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActiveProject"
                        checked={newProject.isActive}
                        onChange={e => setNewProject({ ...newProject, isActive: e.target.checked })}
                        className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                      />
                      <Label htmlFor="isActiveProject" className="cursor-pointer">Currently working on this</Label>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleAddProject} style={{ backgroundColor: '#000' }}>Save Project</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddingProject(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Project
                </Button>
              )}
            </div>
          </div>
        );

      case 'trainer-feedback':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" style={{ color: '#FF6B35' }} />
                <h3 className="text-xl font-semibold">Trainer Feedback</h3>
              </div>
            </div>

            <div className="mb-8 space-y-4">
              <h4 className="font-medium text-lg border-b pb-2">Feedback Received</h4>
              <div className="p-4 border border-dashed border-neutral-200 rounded-xl text-center text-neutral-500">
                <p className="text-sm">No feedback received from trainers yet.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-lg border-b pb-2">Provide Feedback to Trainers</h4>
              <p className="text-sm text-neutral-500 mb-4">Share your thoughts on the teaching methodology and support provided by your batch trainers.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trainers.map(trainer => (
                  <Card key={trainer.id} className="border-neutral-200">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {trainer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h5 className="font-semibold">{trainer.name}</h5>
                          <p className="text-xs text-neutral-500">{trainer.role} • {trainer.subject}</p>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1 flex flex-col justify-end">
                        <div className="flex gap-1 justify-center mb-2">
                          {[1, 2, 3, 4, 5].map((starIndex) => {
                            const currentRating = trainerFeedback[trainer.id]?.rating || 0;
                            return (
                              <button
                                key={starIndex}
                                onClick={() => setTrainerFeedback({
                                  ...trainerFeedback,
                                  [trainer.id]: { ...(trainerFeedback[trainer.id] || { comment: '' }), rating: starIndex }
                                })}
                                className="focus:outline-hidden transition-all duration-150"
                              >
                                <Star
                                  className={`w-6 h-6 ${starIndex <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300 hover:text-yellow-200'}`}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <Textarea
                          placeholder={`Write your feedback for ${trainer.name}...`}
                          className="min-h-[80px] text-sm"
                          value={trainerFeedback[trainer.id]?.comment || ''}
                          onChange={(e) => setTrainerFeedback({
                            ...trainerFeedback,
                            [trainer.id]: { ...(trainerFeedback[trainer.id] || {}), comment: e.target.value }
                          })}
                        />
                        <Button
                          className="w-full text-xs"
                          size="sm"
                          style={{ backgroundColor: '#000' }}
                          onClick={() => handleFeedbackSubmit(trainer.id)}
                        >
                          Submit Feedback
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 'view-resume':
        return <ResumeBuilder />;

      default:
        return null;
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-neutral-900">Profile</h2>
            <p className="text-sm text-neutral-500 truncate">{currentUser?.name}</p>
          </div>
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#7C3AED' }}>
              {currentUser?.name.split(' ').map(n => n[0]).join('') || 'S'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3">
          <Label className="text-xs text-neutral-500">Section</Label>
          <select
            className="mt-2 w-full h-11 px-3 rounded-lg border border-neutral-200 bg-white text-sm font-medium"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h2 className="text-2xl font-bold mb-6">Profile</h2>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? 'text-white shadow-md'
                  : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                style={isActive ? { backgroundColor: '#000', color: 'white' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Content */}
      <div className="flex-1">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
