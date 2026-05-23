import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Download, FileText, Building2, Users, IndianRupee, CheckCircle2, XCircle, Clock, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';

interface InvoiceRecord { id: string; institutionId: string; institutionName: string; batchName: string; totalStudents: number; amountDue: number; amountPaid: number; paymentStatus: 'paid' | 'pending' | 'overdue' | 'partial'; invoiceDate: string; dueDate: string; }

export function Billing() {
    const [institutionFilter, setInstitutionFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('2025');

    const institutions: { id: string; name: string }[] = [];

    const invoices: InvoiceRecord[] = [];

    const filteredInvoices = invoices.filter(inv => {
        const matchesInstitution = institutionFilter === 'all' || inv.institutionId === institutionFilter;
        const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
        const matchesYear = inv.invoiceDate.startsWith(yearFilter);
        return matchesInstitution && matchesStatus && matchesYear;
    });

    const stats = {
        totalInstitutions: new Set(invoices.map(i => i.institutionId)).size,
        totalBatches: invoices.length,
        totalStudents: invoices.reduce((sum, i) => sum + i.totalStudents, 0),
        totalDue: invoices.reduce((sum, i) => sum + i.amountDue, 0),
        totalPaid: invoices.reduce((sum, i) => sum + i.amountPaid, 0),
        paidCount: invoices.filter(i => i.paymentStatus === 'paid').length,
        pendingCount: invoices.filter(i => i.paymentStatus === 'pending' || i.paymentStatus === 'partial').length,
        overdueCount: invoices.filter(i => i.paymentStatus === 'overdue').length,
    };

    const invoiceHeaders = ['Invoice', 'Institution', 'Batch', 'Students', 'Amount Due', 'Amount Paid', 'Status', 'Invoice Date', 'Due Date'];
    const buildInvoiceRows = (data: InvoiceRecord[]) => data.map(inv => ([
        inv.id,
        inv.institutionName,
        inv.batchName,
        inv.totalStudents,
        inv.amountDue,
        inv.amountPaid,
        inv.paymentStatus,
        inv.invoiceDate,
        inv.dueDate,
    ]));

    const handleDownloadHistory = (format: 'excel' | 'pdf') => {
        const rows = buildInvoiceRows(filteredInvoices);
        if (rows.length === 0) {
            toast.error('No invoices to export');
            return;
        }

        if (format === 'pdf') {
            exportToPDF('invoice_history', 'Payment History', invoiceHeaders, rows);
            toast.success('Payment history PDF started');
        } else {
            exportToCSV('invoice_history', invoiceHeaders, rows);
            toast.success('Payment history Excel started');
        }
    };

    const handleDownloadInvoice = (id: string, format: 'excel' | 'pdf' = 'pdf') => {
        const invoice = invoices.find((inv) => inv.id === id);
        if (!invoice) {
            toast.error('Invoice not found');
            return;
        }
        const rows = buildInvoiceRows([invoice]);

        if (format === 'pdf') {
            exportToPDF(`invoice_${id}`, `Invoice ${id}`, invoiceHeaders, rows);
            toast.success(`${id} PDF started`);
        } else {
            exportToCSV(`invoice_${id}`, invoiceHeaders, rows);
            toast.success(`${id} Excel started`);
        }
    };

    const getStatusColor = (s: string) => { switch (s) { case 'paid': return 'bg-green-100 text-green-700'; case 'pending': return 'bg-yellow-100 text-yellow-700'; case 'partial': return 'bg-blue-100 text-blue-700'; case 'overdue': return 'bg-red-100 text-red-700'; default: return 'bg-neutral-100 text-neutral-700'; } };
    const getStatusIcon = (s: string) => { switch (s) { case 'paid': return <CheckCircle2 className="w-4 h-4" />; case 'pending': case 'partial': return <Clock className="w-4 h-4" />; case 'overdue': return <XCircle className="w-4 h-4" />; default: return null; } };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-3xl font-bold text-neutral-900">Billing</h2><p className="text-neutral-600 mt-1">Manage invoices and track payments</p></div>
                <div className="flex gap-2">
                    <Select value="invoice"><SelectTrigger className="w-40"><FileText className="w-4 h-4 mr-2" /><SelectValue placeholder="Invoice" /></SelectTrigger><SelectContent><SelectItem value="invoice">Invoice</SelectItem></SelectContent></Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Download Payment History
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadHistory('excel')}>Excel</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadHistory('pdf')}>PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Institutions</p><h3 className="mt-1 text-2xl font-bold">{stats.totalInstitutions}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100"><Building2 className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Batches</p><h3 className="mt-1 text-2xl font-bold">{stats.totalBatches}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100"><Calendar className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Students</p><h3 className="mt-1 text-2xl font-bold">{stats.totalStudents}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100"><Users className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Collected</p><h3 className="mt-1 text-2xl font-bold">₹{(stats.totalPaid / 100000).toFixed(1)}L</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100"><IndianRupee className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50"><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-green-700">Paid</p><h3 className="text-3xl font-bold text-green-800">{stats.paidCount}</h3><p className="text-xs text-green-600 mt-1">₹{stats.totalPaid.toLocaleString()}</p></div></CardContent></Card>
                <Card className="border-yellow-200 bg-yellow-50"><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-yellow-700">Pending</p><h3 className="text-3xl font-bold text-yellow-800">{stats.pendingCount}</h3><p className="text-xs text-yellow-600 mt-1">₹{(stats.totalDue - stats.totalPaid).toLocaleString()} remaining</p></div></CardContent></Card>
                <Card className="border-red-200 bg-red-50"><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-red-700">Overdue</p><h3 className="text-3xl font-bold text-red-800">{stats.overdueCount}</h3><p className="text-xs text-red-600 mt-1">Requires attention</p></div></CardContent></Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <Select value={institutionFilter} onValueChange={setInstitutionFilter}><SelectTrigger className="w-full md:w-64"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Institution" /></SelectTrigger><SelectContent><SelectItem value="all">All Institutions</SelectItem>{institutions.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}</SelectContent></Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
                <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="w-full md:w-32"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2024">2024</SelectItem></SelectContent></Select>
            </div>

            <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>
                {filteredInvoices.length === 0 ? (<div className="text-center py-12"><FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" /><p className="text-neutral-600">No invoices found</p></div>) : (
                    <Table><TableHeader><TableRow className="bg-neutral-50"><TableHead>Invoice</TableHead><TableHead>Institution</TableHead><TableHead>Batch</TableHead><TableHead className="text-center">Students</TableHead><TableHead className="text-right">Due</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>{filteredInvoices.map(inv => (<TableRow key={inv.id}><TableCell className="font-medium">{inv.id}</TableCell><TableCell>{inv.institutionName}</TableCell><TableCell>{inv.batchName}</TableCell><TableCell className="text-center">{inv.totalStudents}</TableCell><TableCell className="text-right">₹{inv.amountDue.toLocaleString()}</TableCell><TableCell className="text-right">₹{inv.amountPaid.toLocaleString()}</TableCell><TableCell><Badge className={getStatusColor(inv.paymentStatus)}><span className="flex items-center gap-1">{getStatusIcon(inv.paymentStatus)}{inv.paymentStatus}</span></Badge></TableCell><TableCell className="text-center"><Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(inv.id)}><Download className="w-4 h-4" /></Button></TableCell></TableRow>))}</TableBody>
                    </Table>
                )}
            </CardContent></Card>
        </div>
    );
}
