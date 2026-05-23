import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Upload } from 'lucide-react';
import { users, batches } from '../lib/data';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface CSVRow {
  batch_name: string;
  batch_number: string;
  trainer_identifier: string;
  student_identifiers: string;
  _errors?: string[];
}

interface BatchCSVData {
  name: string;
  batchNumber: string;
  trainerId: string;
  studentIds: string[];
}

export function CSVBatchDialog() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<{
    success: BatchCSVData[];
    failed: Array<{ data: CSVRow; error: string }>;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('CSV file is empty or invalid');
          return;
        }

        // Parse CSV
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const requiredHeaders = ['batch_name', 'batch_number', 'trainer_identifier', 'student_identifiers'];
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Missing required headers: ${missingHeaders.join(', ')}`);
          return;
        }

        // Parse rows
        const rows: CSVRow[] = [];
        const errors: Record<number, string[]> = {};

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: CSVRow = {
            batch_name: values[headers.indexOf('batch_name')] || '',
            batch_number: values[headers.indexOf('batch_number')] || '',
            trainer_identifier: values[headers.indexOf('trainer_identifier')] || '',
            student_identifiers: values[headers.indexOf('student_identifiers')] || '',
            _errors: []
          };

          // Validate required fields
          if (!row.batch_name) row._errors?.push('Batch name is required');
          if (!row.batch_number) row._errors?.push('Batch number is required');
          if (!row.trainer_identifier) row._errors?.push('Trainer identifier is required');
          if (!row.student_identifiers) row._errors?.push('At least one student identifier is required');

          if (row._errors && row._errors.length > 0) {
            errors[i - 1] = row._errors;
          }

          rows.push(row);
        }

        setCsvData(rows);
        setValidationErrors(errors);
        setSubmitResults(null);
        
        if (Object.keys(errors).length > 0) {
          toast.warning(`Found ${Object.keys(errors).length} rows with validation errors`);
        } else {
          toast.success(`Successfully parsed ${rows.length} rows`);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file. Please check the format and try again.');
      }
    };

    reader.onerror = () => {
      toast.error('Error reading CSV file');
    };

    reader.readAsText(file);
    setCsvFile(file);
  };

  // Handle batch creation
  const handleCreateBatches = async () => {
    if (csvData.length === 0) return;

    setIsSubmitting(true);
    const results = {
      success: [] as BatchCSVData[],
      failed: [] as Array<{ data: CSVRow; error: string }>
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        try {
          // Skip rows with validation errors
          if (validationErrors[i]) {
            results.failed.push({
              data: row,
              error: `Validation errors: ${validationErrors[i].join(', ')}`
            });
            continue;
          }

          // Check if batch number already exists
          const batchExists = batches.some(b => b.id === `batch-${row.batch_number}`);
          if (batchExists) {
            throw new Error(`Batch with number ${row.batch_number} already exists`);
          }

          // Check if trainer exists
          const trainer = users.find(u => 
            (u.email === row.trainer_identifier || u.id === row.trainer_identifier) && 
            u.role === 'faculty'
          );
          
          if (!trainer) {
            throw new Error(`Trainer not found: ${row.trainer_identifier}`);
          }

          // Process student identifiers
          const studentIds = row.student_identifiers
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(identifier => {
              const student = users.find(u => 
                (u.email === identifier || u.id === identifier) && 
                u.role === 'student'
              );
              if (!student) {
                throw new Error(`Student not found: ${identifier}`);
              }
              return student.id;
            });

          // Create batch data
          const batchData: BatchCSVData = {
            name: row.batch_name,
            batchNumber: row.batch_number,
            trainerId: trainer.id,
            studentIds
          };

          // In a real app, you would call your API here
          // For now, we'll just add to the success list
          results.success.push(batchData);

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          results.failed.push({
            data: row,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      setSubmitResults(results);
      
      if (results.success.length > 0) {
        toast.success(`Successfully created ${results.success.length} batches`);
      }
      if (results.failed.length > 0) {
        toast.error(`Failed to create ${results.failed.length} batches`);
      }

    } catch (error) {
      console.error('Error creating batches:', error);
      toast.error('An error occurred while creating batches');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = 'batch_name,batch_number,trainer_identifier,student_identifiers';
    const csvContent = `${headers}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload Batches (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Batches via CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple batches at once.
            <Button 
              variant="link" 
              className="p-0 h-auto text-primary ml-2"
              onClick={downloadSampleCSV}
            >
              Download Sample CSV
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <label
                  htmlFor="csv-upload"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/90"
                >
                  <span>Upload a CSV file</span>
                  <input
                    id="csv-upload"
                    name="csv-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleCSVUpload}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV file with batch_name, batch_number, trainer_identifier, student_identifiers
              </p>
            </div>
          </div>

          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Preview ({csvData.length} rows)</h3>
                <div className="flex items-center space-x-2">
                  {Object.keys(validationErrors).length > 0 && (
                    <span className="text-sm text-destructive">
                      {Object.keys(validationErrors).length} rows with errors
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsvData([]);
                      setCsvFile(null);
                      setValidationErrors({});
                      setSubmitResults(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <ScrollArea className="h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Batch Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trainer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.map((row, index) => {
                        const hasError = validationErrors[index]?.length > 0;
                        return (
                          <tr 
                            key={index} 
                            className={cn(
                              hasError ? 'bg-red-50' : 'hover:bg-gray-50',
                              submitResults?.failed.some(f => f.data === row) ? 'bg-yellow-50' : ''
                            )}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row.batch_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row.batch_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {row.trainer_identifier}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="max-w-xs truncate">
                                {row.student_identifiers}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {hasError ? (
                                <span className="text-red-600">
                                  {validationErrors[index].join(', ')}
                                </span>
                              ) : submitResults ? (
                                submitResults.success.some(s => 
                                  s.batchNumber === row.batch_number
                                ) ? (
                                  <span className="text-green-600">Created</span>
                                ) : submitResults.failed.some(f => 
                                  f.data === row
                                ) ? (
                                  <span className="text-yellow-600">
                                    {submitResults.failed.find(f => f.data === row)?.error}
                                  </span>
                                ) : null
                              ) : (
                                <span className="text-green-600">Valid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {submitResults && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                      <span className="text-sm">
                        Success: {submitResults.success.length}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                      <span className="text-sm">
                        Failed: {submitResults.failed.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setCsvData([]);
                    setValidationErrors({});
                    setSubmitResults(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={handleCreateBatches}
                  disabled={
                    isSubmitting || 
                    csvData.length === 0 || 
                    Object.keys(validationErrors).length > 0
                  }
                >
                  {isSubmitting ? 'Creating...' : 'Create Batches'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CSVBatchDialog;
