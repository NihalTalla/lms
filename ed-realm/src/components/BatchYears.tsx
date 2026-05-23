import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, Plus, Search, Building2, Users, Trash2, CheckCircle2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

interface BatchYear {
    id: string;
    year: string;
    institutionId: string;
    institutionName: string;
    totalBatches: number;
    totalStudents: number;
    status: 'active' | 'completed' | 'upcoming';
    startDate: string;
    endDate: string;
}

interface BatchYearsProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function BatchYears({ onNavigate }: BatchYearsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [institutionFilter, setInstitutionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedBatchYear, setSelectedBatchYear] = useState<BatchYear | null>(null);
    const [newBatchYear, setNewBatchYear] = useState({ year: '', institutionId: '', startDate: '', endDate: '' });

    const institutions: { id: string; name: string; code: string }[] = [];

    const [batchYears, setBatchYears] = useState<BatchYear[]>([]);

    const filteredBatchYears = batchYears.filter(by => {
        const matchesSearch = by.year.includes(searchTerm) || by.institutionName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesInstitution = institutionFilter === 'all' || by.institutionId === institutionFilter;
        const matchesStatus = statusFilter === 'all' || by.status === statusFilter;
        return matchesSearch && matchesInstitution && matchesStatus;
    });

    const handleAddBatchYear = () => {
        if (!newBatchYear.year || !newBatchYear.institutionId || !newBatchYear.startDate || !newBatchYear.endDate) {
            toast.error('Fill all fields'); return;
        }
        const institution = institutions.find(i => i.id === newBatchYear.institutionId);
        const newEntry: BatchYear = {
            id: String(batchYears.length + 1),
            year: newBatchYear.year,
            institutionId: newBatchYear.institutionId,
            institutionName: institution?.name || '',
            totalBatches: 0,
            totalStudents: 0,
            status: new Date(newBatchYear.startDate) > new Date() ? 'upcoming' : 'active',
            startDate: newBatchYear.startDate,
            endDate: newBatchYear.endDate,
        };
        setBatchYears([newEntry, ...batchYears]);
        toast.success(`Batch Year ${newEntry.year} added`);
        setShowAddDialog(false);
        setNewBatchYear({ year: '', institutionId: '', startDate: '', endDate: '' });
    };

    const handleDeleteBatchYear = () => {
        if (selectedBatchYear) {
            setBatchYears(batchYears.filter(by => by.id !== selectedBatchYear.id));
            toast.success('Deleted');
            setShowDeleteDialog(false);
            setSelectedBatchYear(null);
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-neutral-100 text-neutral-700';
            case 'upcoming': return 'bg-blue-100 text-blue-700';
            default: return 'bg-neutral-100 text-neutral-700';
        }
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900">Batch Years</h2>
                    <p className="text-neutral-600 mt-1">Manage academic years for institutions</p>
                </div>
                <Button onClick={() => setShowAddDialog(true)} style={{ color: 'white' }}><Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />Add Batch Year</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Total</p><h3 className="mt-1 text-2xl font-bold">{batchYears.length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100"><Calendar className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Active</p><h3 className="mt-1 text-2xl font-bold">{batchYears.filter(by => by.status === 'active').length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100"><CheckCircle2 className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Batches</p><h3 className="mt-1 text-2xl font-bold">{batchYears.reduce((s, by) => s + by.totalBatches, 0)}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100"><Building2 className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Students</p><h3 className="mt-1 text-2xl font-bold">{batchYears.reduce((s, by) => s + by.totalStudents, 0)}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
                <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                    <SelectTrigger className="w-full md:w-64"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Institution" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Institutions</SelectItem>{institutions.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem></SelectContent>
                </Select>
            </div>

            <Card><CardHeader><CardTitle>Batch Years</CardTitle></CardHeader><CardContent>
                {filteredBatchYears.length === 0 ? (
                    <div className="text-center py-12"><Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-4" /><p className="text-neutral-600">No batch years found</p></div>
                ) : (
                    <Table><TableHeader><TableRow className="bg-neutral-50"><TableHead>Year</TableHead><TableHead>Institution</TableHead><TableHead className="text-center">Batches</TableHead><TableHead className="text-center">Students</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>{filteredBatchYears.map(by => (
                            <TableRow key={by.id}>
                                <TableCell className="font-semibold">{by.year}</TableCell>
                                <TableCell>{by.institutionName}</TableCell>
                                <TableCell className="text-center">{by.totalBatches}</TableCell>
                                <TableCell className="text-center">{by.totalStudents}</TableCell>
                                <TableCell><Badge className={getStatusColor(by.status)}>{by.status}</Badge></TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="sm" onClick={() => onNavigate?.('batches', { institutionId: by.institutionId, year: by.year })} className="text-blue-600">View</Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedBatchYear(by); setShowDeleteDialog(true); }} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                )}
            </CardContent></Card>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Batch Year</DialogTitle><DialogDescription>Create a new batch year</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium block mb-1">Institution *</label>
                            <Select value={newBatchYear.institutionId} onValueChange={(v) => setNewBatchYear(p => ({ ...p, institutionId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{institutions.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Year *</label>
                            <Select value={newBatchYear.year} onValueChange={(v) => setNewBatchYear(p => ({ ...p, year: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{yearOptions.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium block mb-1">Start *</label><Input type="date" value={newBatchYear.startDate} onChange={(e) => setNewBatchYear(p => ({ ...p, startDate: e.target.value }))} /></div>
                            <div><label className="text-sm font-medium block mb-1">End *</label><Input type="date" value={newBatchYear.endDate} onChange={(e) => setNewBatchYear(p => ({ ...p, endDate: e.target.value }))} /></div>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} style={{ color: 'oklch(.205 0 0)' }}>Cancel</Button>
                        <Button onClick={handleAddBatchYear} style={{ color: 'white' }}><Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />Add</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete</AlertDialogTitle><AlertDialogDescription>Delete {selectedBatchYear?.year} for {selectedBatchYear?.institutionName}?</AlertDialogDescription></AlertDialogHeader>
                    <div className="flex gap-3 justify-end"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBatchYear} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
