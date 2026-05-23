import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Shield,
  GraduationCap,
  BookOpen,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  MoveRight,
  Send,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

interface UserManagementProps {
  onNavigate: (page: string, data?: any) => void;
}

type RoleFilter = 'all' | 'admin' | 'faculty' | 'trainer' | 'student';

export function UserManagement({ onNavigate }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [batchesData, setBatchesData] = useState<any[]>([]);
  const [institutionsData, setInstitutionsData] = useState<any[]>([]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [targetBatch, setTargetBatch] = useState('');
  const [editUserData, setEditUserData] = useState<{
    name: string;
    email: string;
    role: string;
    password?: string;
    institutionId?: string;
    isActive?: boolean;
  }>({ name: '', email: '', role: '' });
  const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', message: '' });

  // allUsers now loaded from API

  const stats = {
    totalUsers: allUsers.length,
    admins: allUsers.filter(u => u.role === 'admin').length,
    faculty: allUsers.filter(u => u.role === 'faculty' || u.role === 'trainer').length,
    students: allUsers.filter(u => u.role === 'student').length,
    activeToday: 128,
  };

  const yearOptions = useMemo<string[]>(() => Array.from(new Set(batchesData.map((b: any) => b.year))).sort((a: string, b: string) => b.localeCompare(a)), [batchesData]);

  // Load users/batches/institutions
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, batchesRes, instRes]: any[] = await Promise.all([api.getUsers(), api.getBatches(), api.getInstitutions()]);
        if (!mounted) return;
        setAllUsers(Array.isArray(usersRes) ? usersRes : (usersRes.items ?? []));
        setBatchesData(Array.isArray(batchesRes) ? batchesRes : []);
        setInstitutionsData(Array.isArray(instRes) ? instRes : []);
      } catch (err) {
        toast.error('Failed to load users or auxiliary data');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user: any) => {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        (user.name || '').toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search);

      const matchesRole = filterRole === 'all' || user.role === filterRole;

      const userBatch = user.batchId ? batchesData.find((b: any) => b.id === user.batchId) : undefined;
      const matchesInstitution = institutionFilter === 'all' || (!!userBatch && userBatch.institutionId === institutionFilter);
      const matchesYear = yearFilter === 'all' || (!!userBatch && userBatch.year === yearFilter);

      return matchesSearch && matchesRole && matchesInstitution && matchesYear;
    });
  }, [allUsers, searchQuery, filterRole, institutionFilter, yearFilter]);

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-4 h-4" />;
    if (role === 'faculty' || role === 'trainer') return <GraduationCap className="w-4 h-4" />;
    if (role === 'student') return <BookOpen className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'var(--color-primary)';
    if (role === 'faculty' || role === 'trainer') return 'var(--color-secondary)';
    if (role === 'student') return 'var(--color-accent)';
    return 'var(--color-neutral)';
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setEditUserData({ name: user.name || '', email: user.email || '', role: user.role || '' });
    setEditDialogOpen(true);
  };

  const openEmailDialog = (user: any) => {
    setSelectedUser(user);
    setEmailDraft({ to: user.email || '', subject: '', message: '' });
    setEmailDialogOpen(true);
  };

  const openMoveDialog = (user: any) => {
    setSelectedUser(user);
    setTargetBatch('');
    setMoveDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!emailDraft.to || !emailDraft.subject || !emailDraft.message) {
      toast.error('Please fill recipient, subject, and message');
      return;
    }
    toast.success(`Email sent to ${emailDraft.to}`);
    setEmailDialogOpen(false);
    setEmailDraft({ to: '', subject: '', message: '' });
  };

  const handleMoveUser = () => {
    if (!selectedUser) return;
    if (!targetBatch) {
      toast.error('Please select a target batch');
      return;
    }
    const batchName = batchesData.find((b: any) => b.id === targetBatch)?.name || 'selected batch';
    toast.success(`${selectedUser.name} moved to ${batchName}`);
    setMoveDialogOpen(false);
    setSelectedUser(null);
    setTargetBatch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">User Management</h2>
          <p className="text-neutral-600 mt-1">Manage users, roles, and permissions across the platform</p>
        </div>
        <Button style={{ backgroundColor: 'var(--color-primary)' }} onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Total Users</p><h3 className="mt-1">{stats.totalUsers}</h3></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}><Users className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Admins</p><h3 className="mt-1">{stats.admins}</h3></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}><Shield className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Faculty/Trainers</p><h3 className="mt-1">{stats.faculty}</h3></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}><GraduationCap className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Students</p><h3 className="mt-1">{stats.students}</h3></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}><BookOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Active Today</p><h3 className="mt-1">{stats.activeToday}</h3></div><div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Institution and Batch Year</CardTitle>
            <CardDescription>Filter users by institution and batch year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Institution</Label>
              <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All institutions</SelectItem>
                  {institutionsData.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setInstitutionFilter('all'); setYearFilter('all'); }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        <div className="xl:col-span-9 space-y-4 min-w-0">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={(v: RoleFilter) => setFilterRole(v)}>
              <SelectTrigger className="w-[170px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback style={{ backgroundColor: getRoleColor(user.role), color: 'white' }}>
                          {(user.name || 'U').split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium break-words">{user.name}</p>
                          <Badge variant="outline" style={{ borderColor: getRoleColor(user.role), color: getRoleColor(user.role) }} className="flex items-center gap-1 whitespace-nowrap">
                            {getRoleIcon(user.role)}
                            {String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1)}
                          </Badge>
                          {user.status === 'inactive' && (
                            <Badge variant="outline" className="border-neutral-400 text-neutral-600">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-neutral-600 flex-wrap">
                          <div className="flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" />{user.email}</div>
                          {user.lastActive && <span>Last active: {user.lastActive}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => openEditDialog(user)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => openEmailDialog(user)}><Send className="w-4 h-4" /></Button>
                      {user.role === 'student' && (
                        <Button variant="outline" size="sm" onClick={() => openMoveDialog(user)} className="border-blue-300 text-blue-600 hover:bg-blue-50 whitespace-nowrap">
                          <MoveRight className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Move</span>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-yellow-500 text-yellow-600 hover:bg-yellow-50" onClick={async () => {
                        try {
                          const newStatus = !user.isActive;
                          await api.updateUserStatus(user.id, newStatus);
                          setAllUsers((prev) => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
                          toast.success(`${user.name} is now ${newStatus ? 'active' : 'inactive'}`);
                        } catch (err) {
                          toast.error('Failed to update status');
                        }
                      }}>
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                        try {
                          await api.updateUserStatus(user.id, false);
                          setAllUsers((prev) => prev.map(u => u.id === user.id ? { ...u, isActive: false } : u));
                          toast.success(`${user.name}'s account has been deactivated`);
                        } catch (err) {
                          toast.error('Failed to deactivate');
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-10 text-neutral-500 border border-dashed rounded-lg bg-neutral-50">
                    No users found for the current filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>Compose and send a message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>To</Label><Input value={emailDraft.to} onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })} /></div>
            <div><Label>Subject</Label><Input value={emailDraft.subject} onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={5} value={emailDraft.message} onChange={(e) => setEmailDraft({ ...emailDraft, message: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendEmail}>Send Email</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move User to Different Batch</DialogTitle>
            <DialogDescription>Move {selectedUser?.name} to a different batch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Batch</Label>
              <Select value={targetBatch} onValueChange={setTargetBatch}>
                <SelectTrigger><SelectValue placeholder="Select target batch" /></SelectTrigger>
                <SelectContent>
                  {batchesData.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleMoveUser}><MoveRight className="w-4 h-4 mr-2" />Move User</Button>
              <Button variant="outline" className="flex-1" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update information for {selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editUserData.name} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={editUserData.email} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={editUserData.role || undefined} onValueChange={(v) => setEditUserData({ ...editUserData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
                <Button className="flex-1" onClick={async () => {
                  try {
                    if (!selectedUser) throw new Error('No user selected');
                    const payload: any = { name: editUserData.name, email: editUserData.email, role: editUserData.role };
                    // allow admin to change institution
                    if ((editUserData as any).institutionId !== undefined) payload.institutionId = (editUserData as any).institutionId;
                    if ((editUserData as any).isActive !== undefined) payload.isActive = (editUserData as any).isActive;
                    await api.updateUser(selectedUser.id, payload);
                    setEditDialogOpen(false);
                    const usersRes: any = await api.getUsers();
                    setAllUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.items ?? []));
                    toast.success(`User "${editUserData.name}" updated successfully`);
                  } catch (err) {
                    toast.error('Failed to update user');
                  }
                }}>
                  Save Changes
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button variant="ghost" className="ml-2 text-sm" onClick={async () => {
                  const newPwd = window.prompt('Enter new temporary password (min 8 chars):');
                  if (!newPwd || newPwd.length < 8) return toast.error('Password must be at least 8 characters');
                  try {
                    await api.resetUserPassword(selectedUser.id, newPwd);
                    toast.success('Password reset');
                    setEditDialogOpen(false);
                  } catch (err) {
                    toast.error('Failed to reset password');
                  }
                }}>Reset Password</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* Reset password action inside edit dialog footer (quick) */}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new user (admin only)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} value={editUserData.name} /></div>
            <div><Label>Email</Label><Input onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} value={editUserData.email} /></div>
            <div>
              <Label>Role</Label>
              <Select value={editUserData.role || undefined} onValueChange={(v) => setEditUserData({ ...editUserData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Temporary Password</Label><Input onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })} value={(editUserData as any).password || ''} /></div>
            <div>
              <Label>Institution</Label>
              <Select value={(editUserData as any).institutionId || undefined} onValueChange={(v) => setEditUserData({ ...editUserData, institutionId: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {institutionsData.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={async () => {
                try {
                  const payload: any = { name: editUserData.name, email: editUserData.email, role: editUserData.role };
                  if ((editUserData as any).password) payload.password = (editUserData as any).password;
                  if ((editUserData as any).institutionId) payload.institutionId = (editUserData as any).institutionId;
                  await api.createUser(payload);
                  toast.success('User created');
                  setAddDialogOpen(false);
                  // refresh
                  const usersRes: any = await api.getUsers();
                  setAllUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.items ?? []));
                } catch (err) {
                  toast.error('Failed to create user');
                }
              }}>Create User</Button>
              <Button variant="outline" className="flex-1" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
