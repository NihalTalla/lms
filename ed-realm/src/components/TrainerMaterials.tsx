import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { FileText, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { useAuth } from '../lib/auth-context';
import { Material, MaterialRequest, loadMaterialRequests, loadMaterials, saveMaterialRequests, saveMaterials } from '../lib/materials-store';

export function TrainerMaterials() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [reqTitle, setReqTitle] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  useEffect(() => {
    const mats = loadMaterials();
    const reqs = loadMaterialRequests();

    setMaterials(mats);
    setRequests(reqs);
  }, [currentUser]);

  const myMaterials = useMemo(() => {
    if (!currentUser) return [];
    return materials.filter(m => m.assignedTrainerIds.includes(currentUser.id));
  }, [materials, currentUser]);

  const submitRequest = () => {
    if (!currentUser || !reqTitle.trim()) return;
    const req: MaterialRequest = {
      id: `req-${Date.now()}`,
      trainerId: currentUser.id,
      title: reqTitle,
      message: reqMsg,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const next = [req, ...requests];
    setRequests(next);
    saveMaterialRequests(next);
    setReqTitle('');
    setReqMsg('');
  };

  const openNativePDF = (mat: Material) => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(mat.title, 20, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(mat.description || '', 20, 30);

      doc.setTextColor(0);
      const splitText = doc.splitTextToSize(mat.content || 'No content provided.', 170);
      doc.text(splitText, 20, 45);

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to generate PDF document');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Materials</h2>
          <p className="text-neutral-600">Materials assigned to you by Admin.</p>
        </div>
      </div>

      <div className="space-y-3">
        {myMaterials.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-neutral-500">No materials assigned yet.</CardContent></Card>
        ) : (
          myMaterials.map(mat => (
            <Card key={mat.id} className="border-neutral-200">
              <CardContent className="p-4 space-y-2">
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
                    <Button size="sm" variant="outline" onClick={() => openNativePDF(mat)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                </div>
                {mat.fileName && <p className="text-xs text-neutral-500">Attachment: {mat.fileName}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-neutral-900">Request additional material</h3>
          <Input placeholder="Topic / title" value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} />
          <Textarea placeholder="Describe what you need" value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={submitRequest}><Send className="w-4 h-4 mr-2" />Send request</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
