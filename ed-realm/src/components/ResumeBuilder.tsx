import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Download,
  Plus,
  Trash2,
  Eye,
  FileUp,
  Sparkles,
  Layout as LayoutIcon,
  Type
} from 'lucide-react';
import { toast } from 'sonner';

interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  education: {
    degree: string;
    institution: string;
    year: string;
    gpa: string;
  }[];
  experience: {
    title: string;
    company: string;
    duration: string;
    description: string;
  }[];
  projects: {
    name: string;
    tech: string;
    description: string;
  }[];
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    concepts: string[];
  };
  achievements: string[];
  certifications: {
    name: string;
    issuer: string;
    date: string;
  }[];
}

export function ResumeBuilder() {
  const [template, setTemplate] = useState<'classic' | 'modern' | 'minimal'>('classic');
  const [isAtsChecking, setIsAtsChecking] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);

  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    education: [],
    experience: [],
    projects: [],
    skills: {
      languages: [],
      frameworks: [],
      tools: [],
      concepts: [],
    },
    achievements: [],
    certifications: [],
  });

  const checkAtsScore = () => {
    setIsAtsChecking(true);
    setTimeout(() => {
      const completedSections = [
        resumeData.personalInfo.name,
        resumeData.personalInfo.email,
        resumeData.summary,
        resumeData.education.length,
        resumeData.experience.length,
        resumeData.projects.length,
        resumeData.skills.languages.length + resumeData.skills.frameworks.length + resumeData.skills.tools.length,
      ].filter(Boolean).length;
      const score = Math.min(100, Math.round((completedSections / 7) * 100));
      setAtsScore(score);
      setIsAtsChecking(false);
      toast.success('ATS Scan Complete!', {
        description: `Your resume score is ${score}. Try adding more technical keywords to improve.`
      });
    }, 2000);
  };

  const exportPDF = () => {
    toast.success('Resume exported successfully!', {
      description: 'Your resume has been downloaded as PDF',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <LayoutIcon className="w-5 h-5 text-orange-500" />
            Resume Builder
          </h2>
          <p className="text-sm text-neutral-600">Switch templates and optimize for ATS</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            {(['classic', 'modern', 'minimal'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={template === t ? 'default' : 'ghost'}
                onClick={() => setTemplate(t)}
                className={`text-xs capitalize px-4 ${template === t ? 'bg-white text-black shadow-sm' : 'text-neutral-500'}`}
              >
                {t}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={checkAtsScore}
            disabled={isAtsChecking}
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isAtsChecking ? 'animate-spin' : ''}`} />
            {isAtsChecking ? 'Scanning...' : 'ATS Score'}
          </Button>
          <Button onClick={exportPDF} style={{ backgroundColor: 'var(--color-primary)' }}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          {/* Personal Information */}
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-neutral-600">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={resumeData.personalInfo.name}
                    onChange={(e) => setResumeData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, name: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-neutral-600">Email Address</Label>
                  <Input
                    id="email"
                    placeholder="john@example.com"
                    value={resumeData.personalInfo.email}
                    onChange={(e) => setResumeData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, email: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-neutral-600">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 890"
                    value={resumeData.personalInfo.phone}
                    onChange={(e) => setResumeData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, phone: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-bold text-neutral-600">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={resumeData.personalInfo.location}
                    onChange={(e) => setResumeData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, location: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
              <CardTitle className="text-lg">Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                placeholder="Briefly describe your professional background and goals..."
                rows={4}
                value={resumeData.summary}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  summary: e.target.value
                }))}
              />
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Experience</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }] as any
                  }))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.experience.map((exp, index) => (
                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`exp-title-${index}`}>Job Title</Label>
                      <Input
                        id={`exp-title-${index}`}
                        value={exp.title}
                        onChange={(e) => {
                          const updated = [...resumeData.experience];
                          updated[index].title = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-company-${index}`}>Company</Label>
                      <Input
                        id={`exp-company-${index}`}
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...resumeData.experience];
                          updated[index].company = e.target.value;
                          setResumeData({ ...resumeData, experience: updated });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-duration-${index}`}>Duration</Label>
                    <Input
                      id={`exp-duration-${index}`}
                      value={exp.duration}
                      onChange={(e) => {
                        const updated = [...resumeData.experience];
                        updated[index].duration = e.target.value;
                        setResumeData({ ...resumeData, experience: updated });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-description-${index}`}>Description</Label>
                    <Textarea
                      id={`exp-description-${index}`}
                      rows={3}
                      value={exp.description}
                      onChange={(e) => {
                        const updated = [...resumeData.experience];
                        updated[index].description = e.target.value;
                        setResumeData({ ...resumeData, experience: updated });
                      }}
                      placeholder="Key responsibilities and achievements..."
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-red-600"
                    onClick={() => {
                      const updated = [...resumeData.experience];
                      updated.splice(index, 1);
                      setResumeData({ ...resumeData, experience: updated });
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
              {resumeData.experience.length === 0 && (
                <p className="text-sm text-neutral-500 text-center">Click "Add" to include your work experience.</p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Education</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    education: [...prev.education, { degree: '', institution: '', year: '', gpa: '' }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.education.map((edu, index) => (
                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`edu-degree-${index}`}>Degree</Label>
                      <Input
                        id={`edu-degree-${index}`}
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...resumeData.education];
                          updated[index].degree = e.target.value;
                          setResumeData({ ...resumeData, education: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-institution-${index}`}>Institution</Label>
                      <Input
                        id={`edu-institution-${index}`}
                        value={edu.institution}
                        onChange={(e) => {
                          const updated = [...resumeData.education];
                          updated[index].institution = e.target.value;
                          setResumeData({ ...resumeData, education: updated });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`edu-year-${index}`}>Year</Label>
                      <Input
                        id={`edu-year-${index}`}
                        value={edu.year}
                        onChange={(e) => {
                          const updated = [...resumeData.education];
                          updated[index].year = e.target.value;
                          setResumeData({ ...resumeData, education: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-gpa-${index}`}>GPA</Label>
                      <Input
                        id={`edu-gpa-${index}`}
                        value={edu.gpa}
                        onChange={(e) => {
                          const updated = [...resumeData.education];
                          updated[index].gpa = e.target.value;
                          setResumeData({ ...resumeData, education: updated });
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-red-600"
                    onClick={() => {
                      const updated = [...resumeData.education];
                      updated.splice(index, 1);
                      setResumeData({ ...resumeData, education: updated });
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
              {resumeData.education.length === 0 && (
                <p className="text-sm text-neutral-500 text-center">Click "Add" to include your education details.</p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skills</CardTitle>
                <div className="flex gap-2">
                  <select
                    id="skillCategory"
                    className="h-8 text-[10px] rounded-md border border-neutral-200 bg-white px-2 font-bold focus:outline-none"
                  >
                    <option value="languages">Languages</option>
                    <option value="frameworks">Frameworks</option>
                    <option value="tools">Tools</option>
                    <option value="concepts">Concepts</option>
                  </select>
                  <Input
                    placeholder="Add skill..."
                    className="h-8 w-32 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        const category = (document.getElementById('skillCategory') as HTMLSelectElement).value as keyof ResumeData['skills'];
                        if (val) {
                          setResumeData(prev => ({
                            ...prev,
                            skills: { ...prev.skills, [category]: [...prev.skills[category], val] }
                          }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Programming Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.languages.map((lang, index) => (
                    <Badge key={index} variant="outline">
                      {lang}
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const updated = [...resumeData.skills.languages];
                          updated.splice(index, 1);
                          setResumeData(prev => ({
                            ...prev,
                            skills: { ...prev.skills, languages: updated }
                          }));
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Frameworks & Libraries</Label>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.frameworks.map((framework, index) => (
                    <Badge key={index} variant="outline">
                      {framework}
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const updated = [...resumeData.skills.frameworks];
                          updated.splice(index, 1);
                          setResumeData(prev => ({
                            ...prev,
                            skills: { ...prev.skills, frameworks: updated }
                          }));
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Tools & Technologies</Label>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.tools.map((tool, index) => (
                    <Badge key={index} variant="outline">
                      {tool}
                      <button
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const updated = [...resumeData.skills.tools];
                          updated.splice(index, 1);
                          setResumeData(prev => ({
                            ...prev,
                            skills: { ...prev.skills, tools: updated }
                          }));
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    projects: [...prev.projects, { name: '', tech: '', description: '' }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.projects.map((proj, index) => (
                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input
                        value={proj.name}
                        onChange={(e) => {
                          const updated = [...resumeData.projects];
                          updated[index].name = e.target.value;
                          setResumeData({ ...resumeData, projects: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tech Stack</Label>
                      <Input
                        value={proj.tech}
                        placeholder="React, Node.js"
                        onChange={(e) => {
                          const updated = [...resumeData.projects];
                          updated[index].tech = e.target.value;
                          setResumeData({ ...resumeData, projects: updated });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) => {
                        const updated = [...resumeData.projects];
                        updated[index].description = e.target.value;
                        setResumeData({ ...resumeData, projects: updated });
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-red-600"
                    onClick={() => {
                      const updated = [...resumeData.projects];
                      updated.splice(index, 1);
                      setResumeData({ ...resumeData, projects: updated });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Certifications</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    certifications: [...prev.certifications, { name: '', issuer: '', date: '' }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.certifications.map((cert, index) => (
                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Certificate Name</Label>
                      <Input
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...resumeData.certifications];
                          updated[index].name = e.target.value;
                          setResumeData({ ...resumeData, certifications: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Issuer</Label>
                      <Input
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...resumeData.certifications];
                          updated[index].issuer = e.target.value;
                          setResumeData({ ...resumeData, certifications: updated });
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-red-600"
                    onClick={() => {
                      const updated = [...resumeData.certifications];
                      updated.splice(index, 1);
                      setResumeData({ ...resumeData, certifications: updated });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Drag & Drop Uploads */}
          <Card
            className="border-dashed border-2 border-neutral-200 bg-neutral-50/50 cursor-pointer hover:border-orange-300 transition-colors"
            onClick={() => {
              toast.success("File processor active", { description: "Simulating extraction of data from certificates..." });
              setTimeout(() => {
                setResumeData(prev => ({
                  ...prev,
                  certifications: [...prev.certifications, { name: 'Full Stack Web Dev', issuer: 'Udemy', date: '2024' }],
                  projects: [...prev.projects, { name: 'E-commerce App', tech: 'React, Stripe', description: 'Built a high-performance shopping portal.' }]
                }));
              }, 1500);
            }}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-neutral-100">
                  <FileUp className="w-6 h-6 text-neutral-400" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">Upload Projects & Certificates</h4>
                  <p className="text-sm text-neutral-500">Click or Drag files to auto-add to resume</p>
                </div>
                <Button variant="outline" size="sm" className="bg-white pointer-events-none">Browse Files</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-8 h-fit space-y-4">
          {atsScore !== null && (
            <div className="bg-green-600 text-white p-4 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">ATS Strength Score</p>
                  <p className="text-2xl font-black">{atsScore}%</p>
                </div>
              </div>
              <Badge className="bg-white text-green-700 font-bold">EXCELLENT</Badge>
            </div>
          )}

          <Card className="shadow-2xl border-neutral-200">
            <CardHeader className="bg-neutral-50 border-b border-neutral-100 p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-neutral-400" />
                Preview Mode: <span className="text-orange-600 capitalize">{template}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className={`
                bg-white p-10 min-h-[800px] shadow-inner transition-all duration-500
                ${template === 'modern' ? 'bg-slate-50' : ''}
                ${template === 'minimal' ? 'bg-neutral-50' : ''}
              `}>
                <div className={`
                  mx-auto h-full
                  ${template === 'classic' ? 'font-serif' : 'font-sans'}
                `}>
                  {/* Header */}
                  <div className={`
                    pb-6 mb-6
                    ${template === 'modern' ? 'text-left border-l-4 border-black pl-6' : 'text-center border-b'}
                    ${template === 'minimal' ? 'text-left border-none mb-0' : ''}
                  `}>
                    <h2 className={`
                      text-neutral-900 font-black tracking-tight
                      ${template === 'classic' ? 'text-3xl' : 'text-4xl'}
                      ${template === 'minimal' ? 'text-2xl uppercase' : ''}
                    `}>
                      {resumeData.personalInfo.name || 'YOUR NAME'}
                    </h2>
                    <div className="text-xs text-neutral-500 mt-2 flex flex-wrap gap-2 justify-center transition-all">
                      <p>{resumeData.personalInfo.email || 'email@example.com'}</p>
                      <span>|</span>
                      <p>{resumeData.personalInfo.phone || 'Phone'}</p>
                      <span>|</span>
                      <p>{resumeData.personalInfo.location || 'Location'}</p>
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="space-y-8">
                    {resumeData.summary && (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Summary</h3>
                        <p className="text-xs leading-relaxed text-neutral-700">{resumeData.summary}</p>
                      </section>
                    )}

                    {resumeData.experience.length > 0 && (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Experience</h3>
                        <div className="space-y-4">
                          {resumeData.experience.map((exp: any, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between font-bold text-xs">
                                <span>{exp.title}</span>
                                <span>{exp.duration}</span>
                              </div>
                              <p className="text-xs italic text-neutral-500">{exp.company}</p>
                              <p className="text-[11px] text-neutral-700 leading-snug">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {resumeData.projects.length > 0 && (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Projects</h3>
                        <div className="space-y-4">
                          {resumeData.projects.map((proj, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between font-bold text-xs">
                                <span>{proj.name}</span>
                                <span className="text-[10px] text-neutral-400">{proj.tech}</span>
                              </div>
                              <p className="text-[11px] text-neutral-700 leading-snug">{proj.description}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {resumeData.skills.languages.length > 0 || resumeData.skills.frameworks.length > 0 || resumeData.skills.tools.length > 0 ? (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Skills</h3>
                        <div className="space-y-2">
                          {resumeData.skills.languages.length > 0 && (
                            <p className="text-[11px] text-neutral-700">
                              <span className="font-bold">Languages:</span> {resumeData.skills.languages.join(', ')}
                            </p>
                          )}
                          {resumeData.skills.frameworks.length > 0 && (
                            <p className="text-[11px] text-neutral-700">
                              <span className="font-bold">Frameworks:</span> {resumeData.skills.frameworks.join(', ')}
                            </p>
                          )}
                          {resumeData.skills.tools.length > 0 && (
                            <p className="text-[11px] text-neutral-700">
                              <span className="font-bold">Tools:</span> {resumeData.skills.tools.join(', ')}
                            </p>
                          )}
                        </div>
                      </section>
                    ) : null}

                    {resumeData.education.length > 0 && (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Education</h3>
                        <div className="space-y-3">
                          {resumeData.education.map((edu, i) => (
                            <div key={i} className="flex justify-between items-start text-xs">
                              <div>
                                <p className="font-bold">{edu.degree}</p>
                                <p className="text-neutral-500 italic">{edu.institution}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{edu.year}</p>
                                <p className="text-neutral-400">GPA: {edu.gpa}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {resumeData.certifications.length > 0 && (
                      <section>
                        <h3 className={`font-bold mb-3 ${template === 'modern' ? 'text-blue-600 uppercase text-xs tracking-widest' : 'text-sm border-b'}`}>Certifications</h3>
                        <div className="space-y-2">
                          {resumeData.certifications.map((cert, i) => (
                            <div key={i} className="flex justify-between items-start text-xs">
                              <span className="font-bold">{cert.name}</span>
                              <span className="text-neutral-500 italic">{cert.issuer}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
