import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText,
  Link2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings
} from 'lucide-react';
import { ResumeBuilder } from './ResumeBuilder';
import { toast } from 'sonner';

interface PlatformConnection {
  platform: string;
  username: string;
  connected: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface StudentSettingsProps {
  onNavigate: (page: string, data?: any) => void;
}

export function StudentSettings({ onNavigate }: StudentSettingsProps) {
  const [activeTab, setActiveTab] = useState('resume');
  const [platformConnections, setPlatformConnections] = useState<PlatformConnection[]>([
    {
      platform: 'LeetCode',
      username: '',
      connected: false,
      icon: () => <span className="text-orange-500 font-bold">LC</span>,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
    },
    {
      platform: 'CodeChef',
      username: '',
      connected: false,
      icon: () => <span className="text-gray-700 font-bold">CC</span>,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
    },
    {
      platform: 'HackerRank',
      username: '',
      connected: false,
      icon: () => <span className="text-green-600 font-bold">HR</span>,
      color: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      platform: 'NeetCode',
      username: '',
      connected: false,
      icon: () => <span className="text-blue-600 font-bold">NC</span>,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      platform: 'Codeforces',
      username: '',
      connected: false,
      icon: () => <span className="text-red-600 font-bold">CF</span>,
      color: 'bg-red-50 border-red-200 text-red-700',
    },
  ]);

  const handleConnectPlatform = (index: number) => {
    const platform = platformConnections[index];
    if (!platform.username.trim()) {
      toast.error(`Please enter your ${platform.platform} username`);
      return;
    }

    const updated = [...platformConnections];
    updated[index] = { ...updated[index], connected: true };
    setPlatformConnections(updated);
    toast.success(`Connected to ${platform.platform} successfully!`);
  };

  const handleDisconnectPlatform = (index: number) => {
    const platform = platformConnections[index];
    const updated = [...platformConnections];
    updated[index] = { ...updated[index], connected: false, username: '' };
    setPlatformConnections(updated);
    toast.success(`Disconnected from ${platform.platform}`);
  };

  const handleSyncFromPlatform = (index: number) => {
    const platform = platformConnections[index];
    toast.success(`Syncing data from ${platform.platform}...`);
    // In a real app, this would fetch data from the platform's API
  };

  const handleSyncToPlatform = (index: number) => {
    const platform = platformConnections[index];
    toast.success(`Syncing LMS profile to ${platform.platform}...`);
    // In a real app, this would push data to the platform's API
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2>Settings</h2>
        <p className="text-neutral-600 mt-1">
          Manage your resume and connect your coding profiles
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resume" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Resume Builder
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Platform Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="mt-6">
          <ResumeBuilder />
        </TabsContent>

        <TabsContent value="platforms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect Coding Platforms</CardTitle>
              <CardDescription>
                Link your LMS profile with coding platforms to sync your progress and achievements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformConnections.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <div
                    key={platform.platform}
                    className={`p-4 border-2 rounded-lg transition-all ${platform.connected
                        ? platform.color
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 ${platform.connected
                            ? platform.color.replace('bg-', 'bg-').replace('border-', 'border-')
                            : 'bg-neutral-50 border-neutral-200'
                          }`}>
                          <Icon />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{platform.platform}</h4>
                            {platform.connected && (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          {platform.connected ? (
                            <p className="text-sm text-neutral-600 mt-1">
                              Profile: <a href={platform.username} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                                View Profile <ExternalLink className="w-3 h-3" />
                              </a>
                            </p>
                          ) : (
                            <p className="text-sm text-neutral-500 mt-1">
                              Connect your {platform.platform} profile link
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!platform.connected ? (
                          <>
                            <Input
                              placeholder={`https://${platform.platform.toLowerCase()}.com/u/profile`}
                              value={platform.username}
                              onChange={(e) => {
                                const updated = [...platformConnections];
                                updated[index].username = e.target.value;
                                setPlatformConnections(updated);
                              }}
                              className="w-64"
                            />
                            <Button
                              onClick={() => handleConnectPlatform(index)}
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              <Link2 className="w-4 h-4 mr-2" />
                              Connect
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncFromPlatform(index)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Sync From
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncToPlatform(index)}
                            >
                              <ExternalLink className="w-4 h-4 mr-2 rotate-180" />
                              Sync To
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisconnectPlatform(index)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Disconnect
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Platform Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-neutral-600">
                <p>
                  <strong>Sync From Platform:</strong> Import your solved problems, ratings, and achievements from the connected platform to your LMS profile.
                </p>
                <p>
                  <strong>Sync To Platform:</strong> Share your LMS progress, course completions, and achievements to the connected platform.
                </p>
                <p className="pt-2 border-t border-neutral-200">
                  <strong>Note:</strong> Platform connections require API access. Some platforms may require additional authentication steps.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

