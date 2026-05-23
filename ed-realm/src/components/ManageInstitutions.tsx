import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Building2, Plus, Search, Mail, Phone, MapPin, Users, Trash2, CheckCircle2, XCircle, Eye, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

interface Institution {
    id: string;
    name: string;
    email1: string;
    email2: string;
    phone1: string;
    phone2: string;
    address: string;
    institutionHead: string;
    accessType: 'free' | 'paid';
    cost?: number;
    collegeCode: string;
    status: 'active' | 'inactive';
    totalBatches: number;
    totalStudents: number;
}

export function ManageInstitutions() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '', email1: '', email2: '', phone1: '', phone2: '',
        address: '', institutionHead: '', accessType: 'free' as 'free' | 'paid',
        cost: '', collegeCode: '', password: '', confirmPassword: ''
    });

    const [institutions, setInstitutions] = useState<Institution[]>([]);

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) || inst.collegeCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const resetForm = () => {
        setFormData({ name: '', email1: '', email2: '', phone1: '', phone2: '', address: '', institutionHead: '', accessType: 'free', cost: '', collegeCode: '', password: '', confirmPassword: '' });
        setCurrentStep(1);
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!formData.name || !formData.email1 || !formData.phone1 || !formData.address || !formData.institutionHead) {
                toast.error('Fill all required fields'); return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!formData.collegeCode) { toast.error('Enter college code'); return; }
            if (formData.accessType === 'paid' && !formData.cost) { toast.error('Enter cost'); return; }
            setCurrentStep(3);
        }
    };

    const handleAddInstitution = () => {
        if (!formData.password || formData.password !== formData.confirmPassword) { toast.error('Passwords must match'); return; }
        if (formData.password.length < 8) { toast.error('Password min 8 chars'); return; }
        const newInst: Institution = {
            id: String(institutions.length + 1), name: formData.name, email1: formData.email1, email2: formData.email2,
            phone1: formData.phone1, phone2: formData.phone2, address: formData.address, institutionHead: formData.institutionHead,
            accessType: formData.accessType, cost: formData.accessType === 'paid' ? parseFloat(formData.cost) : undefined,
            collegeCode: formData.collegeCode, status: 'active', totalBatches: 0, totalStudents: 0
        };
        setInstitutions([newInst, ...institutions]);
        toast.success(`${newInst.name} added`);
        setShowAddDialog(false);
        resetForm();
    };

    const handleDeleteInstitution = () => {
        if (selectedInstitution) {
            setInstitutions(institutions.filter(i => i.id !== selectedInstitution.id));
            toast.success('Removed');
            setShowDeleteDialog(false);
            setSelectedInstitution(null);
        }
    };

    const getStatusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700';
    const getAccessColor = (t: string) => t === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900">Manage Institutions</h2>
                    <p className="text-neutral-600 mt-1">Add, view, and manage institutions</p>
                </div>
                <Button onClick={() => setShowAddDialog(true)} style={{ color: 'white' }}><Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />Add Institution</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Total</p><h3 className="mt-1 text-2xl font-bold">{institutions.length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100"><Building2 className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Active</p><h3 className="mt-1 text-2xl font-bold">{institutions.filter(i => i.status === 'active').length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100"><CheckCircle2 className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Paid</p><h3 className="mt-1 text-2xl font-bold">{institutions.filter(i => i.accessType === 'paid').length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100"><Building2 className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Students</p><h3 className="mt-1 text-2xl font-bold">{institutions.reduce((s, i) => s + i.totalStudents, 0)}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
            </div>

            <Card><CardHeader><CardTitle>Institutions</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow className="bg-neutral-50"><TableHead>Institution</TableHead><TableHead>Code</TableHead><TableHead>Head</TableHead><TableHead className="text-center">Batches</TableHead><TableHead className="text-center">Students</TableHead><TableHead>Access</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredInstitutions.map(inst => (
                        <TableRow key={inst.id}>
                            <TableCell><div className="font-medium">{inst.name}</div><div className="text-xs text-neutral-500">{inst.email1}</div></TableCell>
                            <TableCell><Badge variant="outline">{inst.collegeCode}</Badge></TableCell>
                            <TableCell>{inst.institutionHead}</TableCell>
                            <TableCell className="text-center">{inst.totalBatches}</TableCell>
                            <TableCell className="text-center">{inst.totalStudents}</TableCell>
                            <TableCell><Badge className={getAccessColor(inst.accessType)}>{inst.accessType}{inst.cost && ` ₹${inst.cost}`}</Badge></TableCell>
                            <TableCell><Badge className={getStatusColor(inst.status)}>{inst.status}</Badge></TableCell>
                            <TableCell className="text-center">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedInstitution(inst); setShowViewDialog(true); }}><Eye className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedInstitution(inst); setShowDeleteDialog(true); }}><Trash2 className="w-4 h-4" /></Button>
                            </TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </CardContent></Card>

            <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) resetForm(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add Institution</DialogTitle><DialogDescription>Step {currentStep} of 3</DialogDescription></DialogHeader>
                    <div className="flex items-center justify-center mb-6 gap-2">
                        {[1, 2, 3].map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={`w-10 h-10 rounded-full border font-semibold flex items-center justify-center shadow-sm ${currentStep >= s ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-neutral-700 border-neutral-300'}`}>{s}</div>
                                {i < 2 && <div className={`w-16 h-1 mx-1 rounded-full ${currentStep > s ? 'bg-blue-600' : 'bg-neutral-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-semibold">Basic Information</h3></div>
                            <div><label className="text-sm font-medium block mb-1">Name *</label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium block mb-1">Primary Email *</label><Input type="email" value={formData.email1} onChange={(e) => setFormData(p => ({ ...p, email1: e.target.value }))} /></div>
                                <div><label className="text-sm font-medium block mb-1">Secondary Email</label><Input type="email" value={formData.email2} onChange={(e) => setFormData(p => ({ ...p, email2: e.target.value }))} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium block mb-1">Primary Phone *</label><Input value={formData.phone1} onChange={(e) => setFormData(p => ({ ...p, phone1: e.target.value }))} /></div>
                                <div><label className="text-sm font-medium block mb-1">Secondary Phone</label><Input value={formData.phone2} onChange={(e) => setFormData(p => ({ ...p, phone2: e.target.value }))} /></div>
                            </div>
                            <div><label className="text-sm font-medium block mb-1">Address *</label><Textarea value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} /></div>
                            <div><label className="text-sm font-medium block mb-1">Head *</label><Input value={formData.institutionHead} onChange={(e) => setFormData(p => ({ ...p, institutionHead: e.target.value }))} /></div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-semibold">Details</h3></div>
                            <div><label className="text-sm font-medium block mb-1">Access Type *</label>
                                <Select value={formData.accessType} onValueChange={(v: 'free' | 'paid') => setFormData(p => ({ ...p, accessType: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
                                </Select>
                            </div>
                            {formData.accessType === 'paid' && (
                                <div className="p-4 bg-blue-50 rounded-lg"><label className="text-sm font-medium block mb-1">Cost (₹) *</label><Input type="number" value={formData.cost} onChange={(e) => setFormData(p => ({ ...p, cost: e.target.value }))} /></div>
                            )}
                            <div><label className="text-sm font-medium block mb-1">College Code *</label><Input value={formData.collegeCode} onChange={(e) => setFormData(p => ({ ...p, collegeCode: e.target.value.toUpperCase() }))} /></div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-semibold">Security</h3></div>
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-sm text-amber-800">This password is for institution admin login.</p></div>
                            <div><label className="text-sm font-medium block mb-1">Password *</label><Input type="password" autoComplete="new-password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} /></div>
                            <div><label className="text-sm font-medium block mb-1">Confirm Password *</label><Input type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))} /></div>
                            {formData.password && formData.confirmPassword && (
                                <div className={`flex items-center gap-2 text-sm ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                                    {formData.password === formData.confirmPassword ? <><CheckCircle2 className="w-4 h-4" />Match</> : <><XCircle className="w-4 h-4" />No match</>}
                                </div>
                            )}
                            <div className="p-4 bg-neutral-50 rounded-lg">
                                <p className="text-sm font-semibold mb-2">Summary</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Name: {formData.name}</div><div>Code: {formData.collegeCode}</div>
                                    <div>Type: {formData.accessType}</div>{formData.accessType === 'paid' && <div>Cost: ₹{formData.cost}</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t">
                        <Button variant="outline" onClick={currentStep === 1 ? () => setShowAddDialog(false) : () => setCurrentStep(p => p - 1)} style={{ color: 'oklch(.205 0 0)' }}>
                            <ArrowLeft className="w-4 h-4 mr-2" />{currentStep === 1 ? 'Cancel' : 'Previous'}
                        </Button>
                        {currentStep < 3 ? <Button onClick={handleNextStep} style={{ color: 'white' }}>Next<ArrowRight className="w-4 h-4 ml-2" style={{ color: 'white' }} /></Button> : <Button onClick={handleAddInstitution} style={{ color: 'white' }}><Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />Add</Button>}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{selectedInstitution?.name}</DialogTitle></DialogHeader>
                    {selectedInstitution && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Code</p><p className="font-semibold">{selectedInstitution.collegeCode}</p></div>
                                <div className="p-4 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Status</p><Badge className={getStatusColor(selectedInstitution.status)}>{selectedInstitution.status}</Badge></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-neutral-400 mt-1" /><div><p className="text-sm">{selectedInstitution.email1}</p>{selectedInstitution.email2 && <p className="text-sm text-neutral-500">{selectedInstitution.email2}</p>}</div></div>
                                <div className="flex items-start gap-3"><Phone className="w-4 h-4 text-neutral-400 mt-1" /><div><p className="text-sm">{selectedInstitution.phone1}</p>{selectedInstitution.phone2 && <p className="text-sm text-neutral-500">{selectedInstitution.phone2}</p>}</div></div>
                                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-neutral-400 mt-1" /><p className="text-sm">{selectedInstitution.address}</p></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{selectedInstitution.totalBatches}</p><p className="text-xs text-blue-600">Batches</p></div>
                                <div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{selectedInstitution.totalStudents}</p><p className="text-xs text-green-600">Students</p></div>
                                <div className="p-4 bg-purple-50 rounded-lg text-center"><p className="text-lg font-bold text-purple-700">{selectedInstitution.accessType === 'paid' ? `₹${selectedInstitution.cost}` : 'Free'}</p><p className="text-xs text-purple-600">Access</p></div>
                            </div>
                            <div className="p-4 bg-neutral-50 rounded-lg"><p className="text-xs text-neutral-500">Head</p><p className="font-semibold">{selectedInstitution.institutionHead}</p></div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete</AlertDialogTitle><AlertDialogDescription>Delete {selectedInstitution?.name}?</AlertDialogDescription></AlertDialogHeader>
                    <div className="flex gap-3 justify-end"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteInstitution} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
