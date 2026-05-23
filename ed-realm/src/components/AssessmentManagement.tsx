import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import {
  FolderPlus,
  FileText,
  ChevronDown,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Filter,
  FileBarChart,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { institutions, batches } from '../lib/data';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';

interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface AssessmentReport {
  id: string;
  categoryId: string;
  assessmentId: string;
  categoryName: string;
  assessmentName: string;
  totalStudents: number;
  passedStudents: number;
  averageScore: number;
  generatedAt: string;
}

export function AssessmentManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reports, setReports] = useState<AssessmentReport[]>([]);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');

  // New state for Reports and Progress
  const [reportsFilters, setReportsFilters] = useState({
    institution: '',
    batch: '',
    batchYear: ''
  });
  const [progressFilters, setProgressFilters] = useState({
    institution: '',
    batch: '',
    batchYear: ''
  });
  const [filteredReports, setFilteredReports] = useState<AssessmentReport[]>(reports);
  const [progressData, setProgressData] = useState<any[]>([]);

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [viewCategory, setViewCategory] = useState<Category | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [selectedReportView, setSelectedReportView] = useState<AssessmentReport | null>(null);

  const handleCreateCategory = () => {
    if (!newCategory.name || !newCategory.description) {
      toast.error('Please fill in all fields');
      return;
    }

    const category: Category = {
      id: `cat-${Date.now()}`,
      name: newCategory.name,
      description: newCategory.description,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setCategories([...categories, category]);
    setNewCategory({ name: '', description: '' });
    setIsCategoryDialogOpen(false);
    toast.success('Category created successfully');
  };

  const handleGenerateReport = () => {
    if (!selectedCategory || !selectedAssessment) {
      toast.error('Please select category and assessment');
      return;
    }

    toast.error('Report generation requires assessment results from the API');
  };

  const handleUpdateCategory = () => {
    if (!editCategory) return;
    if (!editCategory.name.trim() || !editCategory.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setCategories((prev) =>
      prev.map((category) =>
        category.id === editCategory.id
          ? { ...category, name: editCategory.name.trim(), description: editCategory.description.trim() }
          : category
      )
    );
    setReports((prev) =>
      prev.map((report) =>
        report.categoryId === editCategory.id
          ? { ...report, categoryName: editCategory.name.trim() }
          : report
      )
    );
    toast.success('Category updated successfully');
    setEditCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    setCategories((prev) => prev.filter((item) => item.id !== categoryId));
    setReports((prev) => prev.filter((report) => report.categoryId !== categoryId));
    toast.success(`${category.name} deleted`);
  };

  const getReportRows = () => {
    const data = filteredReports.length ? filteredReports : reports;
    return data.map(report => ([
      report.categoryName,
      report.assessmentName,
      report.totalStudents,
      report.passedStudents,
      `${report.averageScore}%`,
      report.generatedAt
    ]));
  };

  const handleDownloadConsolidatedReport = (format: 'excel' | 'pdf') => {
    const headers = ['Category', 'Assessment', 'Total Students', 'Passed', 'Average Score', 'Generated On'];
    const rows = getReportRows();

    if (rows.length === 0) {
      toast.error('No reports to export');
      return;
    }

    if (format === 'pdf') {
      exportToPDF('assessment_reports', 'Assessment Reports', headers, rows);
      toast.success('PDF download started');
    } else {
      exportToCSV('assessment_reports', headers, rows);
      toast.success('Excel download started');
    }
  };

  const handleDownloadSingleReport = (report: AssessmentReport) => {
    const headers = ['Category', 'Assessment', 'Total Students', 'Passed', 'Average Score', 'Generated On'];
    const rows = [[
      report.categoryName,
      report.assessmentName,
      report.totalStudents,
      report.passedStudents,
      `${report.averageScore}%`,
      report.generatedAt
    ]];
    exportToPDF(`assessment_report_${report.id}`, `${report.assessmentName} Report`, headers, rows);
    toast.success('Report download started');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Assessment Management</h2>
          <p className="text-neutral-600 mt-1">
            Manage assessment categories and generate performance reports
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download Consolidated Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadConsolidatedReport('excel')}>
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadConsolidatedReport('pdf')}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assessment Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Dashboard</CardTitle>
          <CardDescription>Access reports and track assessment progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 h-10 px-4">
                  <div className="bg-primary/10 p-1 rounded">
                    <FileBarChart className="w-4 h-4 text-primary" />
                  </div>
                  Reports
                  <ChevronDown className="w-4 h-4 text-neutral-400 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-96 p-0">
                <div className="p-3 border-b bg-neutral-50 flex justify-between items-center">
                  <span className="text-sm font-semibold">Assessment Reports</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-white"
                      onClick={() => handleDownloadConsolidatedReport('excel')}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-white"
                      onClick={() => handleDownloadConsolidatedReport('pdf')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Institution</Label>
                    <Select value={reportsFilters.institution} onValueChange={(value) => setReportsFilters({...reportsFilters, institution: value})}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Institution" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batch</Label>
                    <Select
                      value={reportsFilters.batch}
                      onValueChange={(value) => setReportsFilters({...reportsFilters, batch: value})}
                      disabled={!reportsFilters.institution}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map(batch => <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batch Year</Label>
                    <Select value={reportsFilters.batchYear} onValueChange={(value) => setReportsFilters({...reportsFilters, batchYear: value})}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full h-8"
                    onClick={() => {
                      // Filter reports based on selection
                      const filtered = reports.filter(report =>
                        (!reportsFilters.institution || report.categoryId.includes(reportsFilters.institution)) &&
                        (!reportsFilters.batch || report.assessmentId.includes(reportsFilters.batch))
                      );
                      setFilteredReports(filtered);
                      toast.success(`Found ${filtered.length} completed assessments`);
                    }}
                  >
                    Search Reports
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Progress Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 h-10 px-4">
                  <div className="bg-primary/10 p-1 rounded">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  Progress
                  <ChevronDown className="w-4 h-4 text-neutral-400 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-96 p-0">
                <div className="p-3 border-b bg-neutral-50">
                  <span className="text-sm font-semibold">Assessment Progress</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Institution</Label>
                    <Select value={progressFilters.institution} onValueChange={(value) => setProgressFilters({...progressFilters, institution: value})}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Institution" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batch</Label>
                    <Select
                      value={progressFilters.batch}
                      onValueChange={(value) => setProgressFilters({...progressFilters, batch: value})}
                      disabled={!progressFilters.institution}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map(batch => <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Batch Year</Label>
                    <Select value={progressFilters.batchYear} onValueChange={(value) => setProgressFilters({...progressFilters, batchYear: value})}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full h-8"
                    onClick={() => {
                      setProgressData([]);
                      toast.error('Progress data requires assessment results from the API');
                    }}
                  >
                    View Progress
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {category.createdAt}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">{category.description}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewCategory(category)}>
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditCategory(category)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtered Reports Section */}
      {filteredReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Reports</CardTitle>
            <CardDescription>Completed assessments based on your filters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{report.assessmentName}</h3>
                      <p className="text-sm text-neutral-600">{report.categoryName}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Total Students: {report.totalStudents}</span>
                        <span>Passed: {report.passedStudents}</span>
                        <span>Avg Score: {report.averageScore}%</span>
                      </div>
                    </div>
                    <Badge variant="outline">{report.generatedAt}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Section */}
      {progressData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Progress</CardTitle>
            <CardDescription>Current assessment completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{item.assessment}</h3>
                    <span className="text-sm text-neutral-600">{item.completed}/{item.total} completed</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{item.percentage}% complete</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{report.assessmentName}</h3>
                    <p className="text-sm text-neutral-600">{report.categoryName}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Total Students: {report.totalStudents}</span>
                      <span>Passed: {report.passedStudents}</span>
                      <span>Avg Score: {report.averageScore}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedReportView(report)}>
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadSingleReport(report)}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Category Dialog */}
      <Dialog open={!!viewCategory} onOpenChange={(open) => !open && setViewCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewCategory?.name}</DialogTitle>
            <DialogDescription>Category details and linked report stats.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</p>
              <p className="text-sm text-neutral-700 mt-1">{viewCategory?.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Reports Generated</p>
                <p className="text-xl font-bold text-neutral-900 mt-1">
                  {reports.filter((report) => report.categoryId === viewCategory?.id).length}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Average Score</p>
                <p className="text-xl font-bold text-neutral-900 mt-1">
                  {(() => {
                    const related = reports.filter((report) => report.categoryId === viewCategory?.id);
                    if (related.length === 0) return '0%';
                    const total = related.reduce((sum, report) => sum + report.averageScore, 0);
                    return `${Math.round(total / related.length)}%`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category Name</Label>
              <Input
                value={editCategory?.name || ''}
                onChange={(event) =>
                  setEditCategory((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editCategory?.description || ''}
                onChange={(event) =>
                  setEditCategory((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditCategory(null)}>Cancel</Button>
              <Button onClick={handleUpdateCategory}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report View Dialog */}
      <Dialog open={!!selectedReportView} onOpenChange={(open) => !open && setSelectedReportView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedReportView?.assessmentName}</DialogTitle>
            <DialogDescription>Detailed assessment report summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Category</p>
                <p className="font-semibold text-neutral-900 mt-1">{selectedReportView?.categoryName}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Generated On</p>
                <p className="font-semibold text-neutral-900 mt-1">{selectedReportView?.generatedAt}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Total Students</p>
                <p className="font-semibold text-neutral-900 mt-1">{selectedReportView?.totalStudents}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <p className="text-xs text-neutral-500">Passed Students</p>
                <p className="font-semibold text-neutral-900 mt-1">{selectedReportView?.passedStudents}</p>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Average Score</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{selectedReportView?.averageScore}%</p>
            </div>
            <div className="flex justify-end gap-2">
              {selectedReportView && (
                <Button variant="outline" onClick={() => handleDownloadSingleReport(selectedReportView)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button onClick={() => setSelectedReportView(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new assessment category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Internal Assessments"
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Describe the category..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Assessment Report</DialogTitle>
            <DialogDescription>
              Select category and assessment to generate report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="report-category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-assessment">Assessment</Label>
              <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ass-1">DSA Fundamentals Quiz</SelectItem>
                  <SelectItem value="ass-2">Web Development Test</SelectItem>
                  <SelectItem value="ass-3">System Design Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport}>
                Generate Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
