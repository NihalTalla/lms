import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Mail, Phone, MapPin, TrendingUp, Award, BarChart3, Trash2, BookOpen, Send, CheckCircle2, Clock, User, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

interface Trainer {
    id: string;
    name: string;
    email: string;
    phone: string;
    specialization: string;
    batchesAssigned: number;
    studentsManaged: number;
    rating: number;
    experience: string;
    joinDate: string;
    status: 'active' | 'inactive';
}

interface MyTrainersProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function MyTrainers({ onNavigate }: MyTrainersProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [trainers, setTrainers] = useState<Trainer[]>([]);

    const filteredTrainers = trainers.filter(trainer => {
        const matchesSearch = trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainer.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || trainer.status === statusFilter;
        const matchesSpecialization = specializationFilter === 'all' || trainer.specialization === specializationFilter;

        return matchesSearch && matchesStatus && matchesSpecialization;
    });

    const specializations = ['DSA', 'Web Development', 'System Design', 'Cloud Computing'];

    const handleRemoveTrainer = () => {
        if (selectedTrainer) {
            setTrainers(trainers.filter(t => t.id !== selectedTrainer.id));
            setShowDeleteDialog(false);
            setSelectedTrainer(null);
            toast.success(`${selectedTrainer.name} has been removed from trainers list`);
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700';
    };

    return (
        <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900">My Trainers</h2>
                    <p className="text-neutral-600 mt-1">
                        View and manage all trainers assigned to your platform
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onNavigate?.('send-invitation')}
                        style={{ color: 'oklch(.205 0 0)' }}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invitation
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Total Trainers</p>
                                <h3 className="mt-1 text-2xl font-bold">{trainers.length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                                <Award className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Active Trainers</p>
                                <h3 className="mt-1 text-2xl font-bold">{trainers.filter(t => t.status === 'active').length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Avg Rating</p>
                                <h3 className="mt-1 text-2xl font-bold">
                                    {(trainers.reduce((sum, t) => sum + t.rating, 0) / trainers.length).toFixed(1)}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
                                <Award className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Total Students</p>
                                <h3 className="mt-1 text-2xl font-bold">
                                    {trainers.reduce((sum, t) => sum + t.studentsManaged, 0)}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Search by name, email, or specialization..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Filter by specialization" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Specializations</SelectItem>
                        {specializations.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Trainers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Trainers List</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredTrainers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-neutral-600">No trainers found matching your criteria</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Specialization</TableHead>
                                        <TableHead className="text-center">Batches</TableHead>
                                        <TableHead className="text-center">Students</TableHead>
                                        <TableHead className="text-center">Rating</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTrainers.map(trainer => (
                                        <TableRow key={trainer.id} className="hover:bg-neutral-50">
                                            <TableCell className="font-medium">{trainer.name}</TableCell>
                                            <TableCell className="text-sm text-neutral-600">{trainer.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{trainer.specialization}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-medium">{trainer.batchesAssigned}</TableCell>
                                            <TableCell className="text-center font-medium">{trainer.studentsManaged}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="font-semibold">{trainer.rating}</span>
                                                    <span className="text-yellow-500">★</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(trainer.status)}>
                                                    {trainer.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedTrainer(trainer);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Trainer Details Section */}
            {selectedTrainer && !showDeleteDialog && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{selectedTrainer.name} - Detailed Profile</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTrainer(null)}
                            >
                                ✕
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-neutral-600 font-semibold">Email</p>
                                <p className="mt-1 flex items-center gap-1 text-sm">
                                    <Mail className="w-4 h-4" /> {selectedTrainer.email}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-600 font-semibold">Phone</p>
                                <p className="mt-1 flex items-center gap-1 text-sm">
                                    <Phone className="w-4 h-4" /> {selectedTrainer.phone}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-600 font-semibold">Experience</p>
                                <p className="mt-1 text-sm font-medium">{selectedTrainer.experience}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-600 font-semibold">Join Date</p>
                                <p className="mt-1 text-sm font-medium">{selectedTrainer.joinDate}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {selectedTrainer?.name} from the trainers list? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel style={{ color: 'oklch(.205 0 0)' }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveTrainer}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Remove
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}



interface InvitationRecord {
    id: string;
    trainerEmail: string;
    trainerName: string;
    batchName: string;
    batchId: string;
    sentDate: string;
    status: 'pending' | 'accepted' | 'rejected';
    messagePreview: string;
}

interface SendInvitationProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function SendInvitation({ onNavigate }: SendInvitationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState('');
    const [selectedRecipients, setSelectedRecipients] = useState<{ name: string; email: string }[]>([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [invitations, setInvitations] = useState<InvitationRecord[]>([]);

    const batches: { id: string; name: string; code: string; students: number }[] = [];

    const availableTrainers: { id: string; name: string; email: string; specialization: string }[] = [];

    const filteredTrainers = availableTrainers.filter(t =>
        t.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
        t.email.toLowerCase().includes(recipientSearch.toLowerCase())
    );

    const addRecipient = (trainer: { name: string; email: string }) => {
        if (selectedRecipients.some(r => r.email === trainer.email)) {
            toast.info('Recipient already added');
            return;
        }
        setSelectedRecipients([...selectedRecipients, trainer]);
        setRecipientSearch('');
    };

    const addCustomRecipient = () => {
        const email = recipientSearch.trim();
        if (!email) return;
        const emailValid = /\S+@\S+\.\S+/.test(email);
        if (!emailValid) {
            toast.error('Enter a valid email address');
            return;
        }
        const name = email.split('@')[0].replace('.', ' ');
        addRecipient({ name: name || 'Invited Trainer', email });
    };

    const handleSendInvitation = () => {
        if (!selectedBatch) {
            toast.error('Please choose a batch');
            return;
        }
        if (selectedRecipients.length === 0) {
            toast.error('Add at least one recipient');
            return;
        }

        const batch = batches.find(b => b.id === selectedBatch);
        if (!batch) {
            toast.error('Invalid batch selected');
            return;
        }

        const nextId = Math.max(...invitations.map(i => parseInt(i.id)), 0);
        const newInvitations: InvitationRecord[] = selectedRecipients.map((recipient, idx) => ({
            id: (nextId + idx + 1).toString(),
            trainerEmail: recipient.email,
            trainerName: recipient.name,
            batchName: batch.name,
            batchId: batch.id,
            sentDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            messagePreview: customMessage || `You have been invited to teach ${batch.name}...`,
        }));

        setInvitations([...newInvitations, ...invitations]);
        toast.success(`Invitation sent to ${newInvitations.length} recipient(s)`);

        // Reset form
        setRecipientSearch('');
        setSelectedRecipients([]);
        setSelectedBatch('');
        setCustomMessage('');
        setIsOpen(false);
    };

    const handleDeleteInvitation = (id: string) => {
        const invitation = invitations.find(i => i.id === id);
        setInvitations(invitations.filter(i => i.id !== id));
        toast.success(`Invitation to ${invitation?.trainerName} has been deleted`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'rejected':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-neutral-100 text-neutral-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'accepted':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'pending':
                return <Clock className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const stats = {
        total: invitations.length,
        accepted: invitations.filter(i => i.status === 'accepted').length,
        pending: invitations.filter(i => i.status === 'pending').length,
    };

    return (
        <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900">Send Trainer Invitations</h2>
                    <p className="text-neutral-600 mt-1">
                        Assign trainers to batches by sending invitations
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button style={{ color: 'white' }}>
                            <Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                            Send New Invitation
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="px-6 pt-6 pb-3 border-b border-neutral-200 bg-white sticky top-0 z-10">
                            <DialogTitle>Send Trainer Invitation</DialogTitle>
                            <DialogDescription>
                                Invite a trainer to teach a specific batch
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-6">
                            {/* Trainer Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-neutral-700 block">
                                    Recipients <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={recipientSearch}
                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                    />
                                    <Button variant="outline" onClick={addCustomRecipient}>
                                        Add Email
                                    </Button>
                                </div>
                                <div className="border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-neutral-50">
                                    {filteredTrainers.length === 0 ? (
                                        <p className="text-sm text-neutral-500">No matches. Use "Add Email" to invite manually.</p>
                                    ) : (
                                        filteredTrainers.map(trainer => (
                                            <button
                                                key={trainer.id}
                                                onClick={() => addRecipient(trainer)}
                                                className="w-full text-left p-3 rounded-lg bg-white border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                                            >
                                                <div className="font-medium text-sm text-neutral-900">{trainer.name}</div>
                                                <div className="text-xs text-neutral-600">{trainer.email}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                                {selectedRecipients.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRecipients.map((rec) => (
                                            <Badge key={rec.email} variant="outline" className="flex items-center gap-2 border-blue-300 text-blue-700">
                                                <Mail className="w-3 h-3" />
                                                {rec.name} ({rec.email})
                                                <button onClick={() => setSelectedRecipients(selectedRecipients.filter(r => r.email !== rec.email))} className="text-blue-700">
                                                    &times;
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Batch Selection */}
                            <div>
                                <label className="text-sm font-semibold text-neutral-700 block mb-2">
                                    Select Batch <span className="text-red-500">*</span>
                                </label>
                                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a batch..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map(batch => (
                                            <SelectItem key={batch.id} value={batch.id}>
                                                {batch.name} ({batch.students} students)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Custom Message */}
                            <div>
                                <label className="text-sm font-semibold text-neutral-700 block mb-2">
                                    Custom Message (Optional)
                                </label>
                                <Textarea
                                    placeholder="Add a custom message to the invitation..."
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="min-h-24"
                                />
                            </div>

                            {/* Preview */}
                            {selectedBatch && (
                                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                                    <p className="text-xs font-semibold text-neutral-600 mb-2">INVITATION PREVIEW</p>
                                    <div className="text-sm space-y-2 text-neutral-700">
                                        <div>
                                            <strong>To:</strong>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedRecipients.map(rec => (
                                                    <Badge key={rec.email} variant="outline" className="border-neutral-300">
                                                        {rec.name} ({rec.email})
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <p>
                                            <strong>Batch:</strong> {batches.find(b => b.id === selectedBatch)?.name}
                                        </p>
                                        {customMessage && (
                                            <p>
                                                <strong>Message:</strong> {customMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="border-t border-neutral-200 bg-white px-6 py-3 flex gap-3 justify-end sticky bottom-0 z-10">
                            <Button
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                style={{ color: 'oklch(.205 0 0)' }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSendInvitation} style={{ color: 'white' }}>
                                <Send className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                                Send Invitation
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Total Invitations</p>
                                <h3 className="mt-1 text-2xl font-bold">{stats.total}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                                <Mail className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Accepted</p>
                                <h3 className="mt-1 text-2xl font-bold">{stats.accepted}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600">Pending</p>
                                <h3 className="mt-1 text-2xl font-bold">{stats.pending}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invitations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Invitation History</CardTitle>
                </CardHeader>
                <CardContent>
                    {invitations.length === 0 ? (
                        <div className="text-center py-12">
                            <Mail className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                            <p className="text-neutral-600">No invitations sent yet</p>
                            <p className="text-sm text-neutral-500 mt-1">Send your first trainer invitation to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50">
                                        <TableHead>Trainer Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Batch Name</TableHead>
                                        <TableHead>Sent Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map(invitation => (
                                        <TableRow key={invitation.id} className="hover:bg-neutral-50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-neutral-400" />
                                                    {invitation.trainerName}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-neutral-600">{invitation.trainerEmail}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4 text-neutral-400" />
                                                    <span className="text-sm">{invitation.batchName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{invitation.sentDate}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(invitation.status)}>
                                                    <span className="flex items-center gap-1">
                                                        {getStatusIcon(invitation.status)}
                                                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                                                    </span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteInvitation(invitation.id)}
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}

