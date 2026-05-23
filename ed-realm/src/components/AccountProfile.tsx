import React from 'react';
import { useAuth } from '../lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowLeft, User, FileText } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';

interface ProfileDraft {
  displayName: string;
  email: string;
  phone: string;
  timezone: string;
  bio: string;
}

interface AccountProfileProps {
  onNavigate: (page: string, data?: unknown) => void;
}

const STORAGE_KEY = 'codify_profile_drafts';

const loadDraft = (userId: string, fallback: ProfileDraft): ProfileDraft => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ProfileDraft>) : {};
    return parsed[userId] || fallback;
  } catch {
    return fallback;
  }
};

const saveDraft = (userId: string, draft: ProfileDraft) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ProfileDraft>) : {};
    parsed[userId] = draft;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures for this local profile draft.
  }
};

export function AccountProfile({ onNavigate }: AccountProfileProps) {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = React.useState<'account-details' | 'about'>('account-details');

  const initialDraft = React.useMemo<ProfileDraft>(
    () => ({
      displayName: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: '',
      timezone: 'Asia/Kolkata',
      bio: '',
    }),
    [currentUser?.email, currentUser?.name]
  );

  const [draft, setDraft] = React.useState<ProfileDraft>(initialDraft);

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    setDraft(loadDraft(currentUser.id, initialDraft));
  }, [currentUser, initialDraft]);

  if (!currentUser) {
    return null;
  }

  const handleSave = () => {
    saveDraft(currentUser.id, draft);
    toast.success('Profile details saved');
  };

  const renderMainSection = () => {
    if (activeSection === 'about') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Role summary</CardTitle>
            <CardDescription>Quick overview for your workspace identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-neutral-100 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Account role</div>
              <div className="mt-2 text-lg font-semibold capitalize text-neutral-900">{currentUser.role}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-600">
              Updates saved here are stored locally so your profile remains consistent after refresh.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>These fields are shared across mobile and desktop views.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={draft.displayName}
                onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email address</Label>
              <Input
                id="emailAddress"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone</Label>
              <Input
                id="phoneNumber"
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Add a contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeZone">Timezone</Label>
              <Input
                id="timeZone"
                value={draft.timezone}
                onChange={(event) => setDraft((prev) => ({ ...prev, timezone: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={6}
              value={draft.bio}
              onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
              placeholder="Add a short introduction for your LMS profile"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>Save profile</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const menuItems = [
    { id: 'account-details' as const, label: 'Account Details', icon: User },
    { id: 'about' as const, label: 'Role Summary', icon: FileText },
  ];

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
            <p className="text-sm text-neutral-500 truncate">{currentUser.name}</p>
          </div>
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#7C3AED' }}>
              {currentUser.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3">
          <Label className="text-xs text-neutral-500">Section</Label>
          <select
            className="mt-2 w-full h-11 px-3 rounded-lg border border-neutral-200 bg-white text-sm font-medium"
            value={activeSection}
            onChange={(event) => setActiveSection(event.target.value as 'account-details' | 'about')}
          >
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {renderMainSection()}
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

        <h2 className="text-2xl font-bold mb-2">Profile</h2>
        <Badge variant="outline" className="w-fit capitalize mb-6">
          {currentUser.role}
        </Badge>

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

      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#7C3AED' }}>
              {(draft.displayName || currentUser.name).split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold text-neutral-900">{draft.displayName || currentUser.name}</h3>
            <p className="text-sm text-neutral-500">{currentUser.email}</p>
          </div>
        </div>

        {renderMainSection()}
      </div>
    </div>
  );
}
