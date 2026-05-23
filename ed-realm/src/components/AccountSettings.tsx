import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';

interface SettingsDraft {
  emailNotifications: string;
  mobileNotifications: string;
  reminderWindow: string;
  defaultLandingPage: string;
}

const STORAGE_KEY = 'codify_account_settings';

const loadSettings = (userId: string): SettingsDraft => {
  const fallback: SettingsDraft = {
    emailNotifications: 'Enabled',
    mobileNotifications: 'Enabled',
    reminderWindow: '30 minutes',
    defaultLandingPage: 'dashboard',
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SettingsDraft>) : {};
    return parsed[userId] || fallback;
  } catch {
    return fallback;
  }
};

const saveSettings = (userId: string, settings: SettingsDraft) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SettingsDraft>) : {};
    parsed[userId] = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures for this local settings draft.
  }
};

export function AccountSettings() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = React.useState<SettingsDraft>({
    emailNotifications: 'Enabled',
    mobileNotifications: 'Enabled',
    reminderWindow: '30 minutes',
    defaultLandingPage: 'dashboard',
  });

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    setSettings(loadSettings(currentUser.id));
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const handleSave = () => {
    saveSettings(currentUser.id, settings);
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Settings</h2>
          <p className="text-neutral-600 mt-1">These preferences are shared between mobile and desktop views.</p>
        </div>
        <Badge variant="outline" className="w-fit capitalize">
          {currentUser.role}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Control how the LMS contacts you about activity and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailNotifications">Email notifications</Label>
              <Input
                id="emailNotifications"
                value={settings.emailNotifications}
                onChange={(event) => setSettings((prev) => ({ ...prev, emailNotifications: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNotifications">Mobile notifications</Label>
              <Input
                id="mobileNotifications"
                value={settings.mobileNotifications}
                onChange={(event) => setSettings((prev) => ({ ...prev, mobileNotifications: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace defaults</CardTitle>
            <CardDescription>Set the default landing page and reminder window for this account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminderWindow">Reminder window</Label>
              <Input
                id="reminderWindow"
                value={settings.reminderWindow}
                onChange={(event) => setSettings((prev) => ({ ...prev, reminderWindow: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultLandingPage">Default landing page</Label>
              <Input
                id="defaultLandingPage"
                value={settings.defaultLandingPage}
                onChange={(event) => setSettings((prev) => ({ ...prev, defaultLandingPage: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save settings</Button>
      </div>
    </div>
  );
}
