import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Mail, Phone, MapPin, Clock, Award, Users, ArrowLeft, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Label } from './ui/label';
import { useIsMobile } from './ui/use-mobile';

interface TrainerProfileProps {
  onNavigate: (page: string, data?: unknown) => void;
}

export function TrainerProfile({ onNavigate }: TrainerProfileProps) {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = React.useState<'basic-info' | 'impact'>('basic-info');

  const profile = {
    name: currentUser?.name || 'Trainer',
    email: currentUser?.email || 'trainer@example.com',
    phone: '+1 (555) 123-4567',
    location: 'Remote / Global',
    specialization: 'Algorithms & System Design',
    experience: '6 years',
    students: 180,
    batches: 8,
    bio: 'Dedicated to helping learners build strong problem-solving skills with real-world coding challenges and live feedback.',
    availability: 'Weekdays 6-9 PM, Weekends 10 AM-2 PM',
  };

  const menuItems = [
    { id: 'basic-info' as const, label: 'Basic Info', icon: User },
    { id: 'impact' as const, label: 'Impact & Summary', icon: BarChart3 },
  ];

  const renderMainContent = () => {
    if (activeSection === 'impact') {
      return (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>At a Glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Mail className="w-4 h-4 text-neutral-500" /> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Phone className="w-4 h-4 text-neutral-500" /> {profile.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <MapPin className="w-4 h-4 text-neutral-500" /> {profile.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Clock className="w-4 h-4 text-neutral-500" /> {profile.availability}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Users className="w-4 h-4 text-neutral-500" /> Students mentored
                </div>
                <span className="font-bold">{profile.students}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Award className="w-4 h-4 text-neutral-500" /> Batches handled
                </div>
                <span className="font-bold">{profile.batches}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input defaultValue={profile.name} />
            </div>
            <div>
              <label className="text-sm font-medium">Specialization</label>
              <Input defaultValue={profile.specialization} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" defaultValue={profile.email} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input defaultValue={profile.phone} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Availability</label>
            <Input defaultValue={profile.availability} />
          </div>
          <div>
            <label className="text-sm font-medium">Bio</label>
            <Textarea rows={4} defaultValue={profile.bio} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    );
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
            <p className="text-sm text-neutral-500 truncate">{profile.name}</p>
          </div>
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#7C3AED' }}>
              {profile.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3">
          <Label className="text-xs text-neutral-500">Section</Label>
          <select
            className="mt-2 w-full h-11 px-3 rounded-lg border border-neutral-200 bg-white text-sm font-medium"
            value={activeSection}
            onChange={(event) => setActiveSection(event.target.value as 'basic-info' | 'impact')}
          >
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {renderMainContent()}
      </div>
    );
  }

  return (
    <div className="flex gap-6">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
                style={isActive ? { backgroundColor: '#000', color: 'white' } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              {profile.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">{profile.name}</h2>
            <p className="text-neutral-600 mt-1">Manage your trainer information</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="border-neutral-300 text-neutral-700">{profile.specialization}</Badge>
              <Badge variant="outline" className="border-neutral-300 text-neutral-700">{profile.experience} experience</Badge>
            </div>
          </div>
        </div>

        {renderMainContent()}
      </div>
    </div>
  );
}
