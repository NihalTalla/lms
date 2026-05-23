import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bell, Eye, FileText, Plus, Upload, Users } from 'lucide-react';
import { users } from '../lib/data';
import { Material, MaterialRequest, loadMaterialRequests, loadMaterials, saveMaterialRequests, saveMaterials } from '../lib/materials-store';

export function MaterialManagement() {
  const trainerUsers = useMemo(() => users.filter(u => u.role === 'trainer'), []);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [newMaterial, setNewMaterial] = useState<Omit<Material, 'id'>>({
    title: '',
    format: 'pdf',
    description: '',
    fileName: '',
    content: '',
    assignedTrainerIds: [],
  });
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const loaded = loadMaterials();
    setMaterials(loaded.length ? loaded : []);
    setRequests(loadMaterialRequests());
  }, []);

  useEffect(() => { saveMaterials(materials); }, [materials]);
  useEffect(() => { saveMaterialRequests(requests); }, [requests]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const filteredAssignTrainers = trainerUsers.filter(t =>
    t.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const handleCreate = () => {
    if (!newMaterial.title.trim()) return;
    const mat: Material = { id: `mat-${Date.now()}`, ...newMaterial, fileName };
    setMaterials(prev => [mat, ...prev]);
    setCreateOpen(false);
    setNewMaterial({ title: '', format: 'pdf', description: '', fileName: '', content: '', assignedTrainerIds: [] });
    setFileName('');
  };

  const toggleAssign = (id: string, trainerId: string) => {
    setMaterials(prev => prev.map(m => m.id === id ? {
      ...m,
      assignedTrainerIds: m.assignedTrainerIds.includes(trainerId)
        ? m.assignedTrainerIds.filter(t => t !== trainerId)
        : [...m.assignedTrainerIds, trainerId]
    } : m));
  };

  const updateRequestStatus = (id: string, status: MaterialRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900">Materials</h2>
            <p className="text-neutral-600">Create, manage, and assign materials to trainers.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Material
            </Button>
            <Button variant="outline" onClick={() => setNotifyOpen(true)}>
              <Bell className="w-4 h-4 mr-2" /> Notifications
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{pendingCount}</span>
              )}
            </Button>
          </div>
        </div>

      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({pendingCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-3">
          {materials.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-neutral-500">No materials yet.</CardContent></Card>
          ) : (
            materials.map(mat => (
              <Card key={mat.id} className="border-neutral-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-neutral-500" />
                      <div>
                        <h3 className="font-semibold text-neutral-900">{mat.title}</h3>
                        <p className="text-sm text-neutral-500">{mat.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{mat.format}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setViewMaterial(mat)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assign to trainers</p>
                    <div className="flex flex-wrap gap-2">
                      {trainerUsers.map(tr => {
                        const active = mat.assignedTrainerIds.includes(tr.id);
                        return (
                          <Button
                            key={tr.id}
                            variant={active ? 'default' : 'outline'}
                            size="sm"
                            className={active ? 'bg-primary text-white' : ''}
                            onClick={() => toggleAssign(mat.id, tr.id)}
                          >
                            <Users className="w-4 h-4 mr-2" /> {tr.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {mat.fileName && (
                    <div className="text-xs text-neutral-500">Attached: {mat.fileName}</div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3">
          {requests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-neutral-500">No material requests.</CardContent></Card>
          ) : (
            requests.map(req => {
              const trainer = users.find(u => u.id === req.trainerId);
              return (
                <Card key={req.id}>
                  <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{req.title}</p>
                      <p className="text-sm text-neutral-500">{trainer?.name || 'Trainer'} • {new Date(req.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-neutral-600 mt-2">{req.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{req.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => updateRequestStatus(req.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateRequestStatus(req.id, 'declined')}>Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Material</DialogTitle>
            <DialogDescription>Upload or write material content, then assign to trainers.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Material title"
              value={newMaterial.title}
              onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
            />
            <Textarea
              placeholder="Short description"
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
            />
            <Select
              value={newMaterial.format}
              onValueChange={(v) => setNewMaterial({ ...newMaterial, format: v as 'pdf' | 'doc' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Assign now</p>
              <Input
                placeholder="Search trainers by name or email..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="bg-white"
              />
              <div className="flex flex-wrap gap-2">
                {filteredAssignTrainers.map(tr => {
                  const active = newMaterial.assignedTrainerIds.includes(tr.id);
                  return (
                    <Button
                      key={tr.id}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      className={active ? 'bg-primary text-white' : ''}
                      onClick={() => {
                        setNewMaterial(prev => ({
                          ...prev,
                          assignedTrainerIds: active
                            ? prev.assignedTrainerIds.filter(id => id !== tr.id)
                            : [...prev.assignedTrainerIds, tr.id],
                        }));
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" /> {tr.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
              <Button variant="outline"><Upload className="w-4 h-4 mr-2" />Attach</Button>
            </div>

            <Textarea
              placeholder="Or paste material text here"
              value={newMaterial.content}
              onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
              className="min-h-[120px]"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewMaterial?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{viewMaterial?.format}</Badge>
              {viewMaterial?.fileName && <span className="text-xs text-neutral-500">Attached: {viewMaterial.fileName}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-neutral-700 whitespace-pre-wrap">{viewMaterial?.description}</p>
            {viewMaterial?.content && (
              <pre className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm text-neutral-800 whitespace-pre-wrap">{viewMaterial?.content}</pre>
            )}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Assigned Trainers</p>
              <div className="flex flex-wrap gap-2">
                {viewMaterial?.assignedTrainerIds.length ? (
                  viewMaterial.assignedTrainerIds.map(id => {
                    const tr = trainerUsers.find(t => t.id === id);
                    return <Badge key={id} variant="secondary">{tr?.name || id}</Badge>;
                  })
                ) : (
                  <span className="text-sm text-neutral-500">Not assigned</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Material Requests</DialogTitle>
            <DialogDescription>Review and act on trainer requests.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {requests.length === 0 && (
              <Card><CardContent className="p-6 text-center text-neutral-500">No requests.</CardContent></Card>
            )}
            {requests.map(req => {
              const trainer = users.find(u => u.id === req.trainerId);
              return (
                <Card key={req.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-neutral-900">{req.title}</p>
                        <p className="text-xs text-neutral-500">{trainer?.name || 'Trainer'} • {new Date(req.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{req.status}</Badge>
                    </div>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{req.message}</p>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => updateRequestStatus(req.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateRequestStatus(req.id, 'declined')}>Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
