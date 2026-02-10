import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Search, MoreVertical, Pencil, Trash2, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { useEntries, Entry } from '@/hooks/useEntries';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download, Filter, Calendar as CalendarIcon, X, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

interface EntriesTableProps {
  menuId: string;
  onEdit: (entry: Entry) => void;
}

export function EntriesTable({ menuId, onEdit }: EntriesTableProps) {
  const { fields, isLoading: fieldsLoading } = useFormFields(menuId);
  const { entries, isLoading: entriesLoading, deleteEntry, createEntry, deleteAllEntries } = useEntries(menuId);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let successCount = 0;
        const toastId = toast.loading(`Importing ${data.length} entries...`);

        let missingColumns: string[] = [];
        let mappingDebug: string[] = [];

        if (data.length > 0) {
          const firstRow = data[0] as Record<string, unknown>;
          const rowKeys = Object.keys(firstRow);
          console.log('Excel Headers detected:', rowKeys);

          const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

          // Helper for smart column matching
          const findBestMatch = (label: string) => {
            const cleanLabel = label.trim().toLowerCase();
            const normLabel = normalize(label);

            // 0. Manual Aliases & Specific "Area" fix
            // 'dokumentasi' often maps to 'link', 'url', 'lampiran', 'file'
            if (normLabel.includes('dokumentasi') || normLabel.includes('file') || normLabel.includes('gambar')) {
              const docMatch = rowKeys.find(k => {
                const nk = normalize(k);
                return nk.includes('dokumentasi') || nk.includes('link') || nk.includes('url') || nk.includes('file') || nk.includes('lampiran') || nk.includes('image');
              });
              if (docMatch) return docMatch;
            }

            if (normLabel.includes('area') || normLabel.includes('lokasi') || normLabel.includes('wilayah')) {
              const exactArea = rowKeys.find(k => normalize(k) === 'area');
              if (exactArea) return exactArea;

              const areaMatch = rowKeys.find(k => {
                const nk = normalize(k);
                return nk.includes('area') || nk.includes('lokasi') || nk.includes('location') || nk.includes('tempat') || nk.includes('subarea');
              });
              if (areaMatch) return areaMatch;
            }

            // 1. Exact Match
            const exact = rowKeys.find(k => k.trim().toLowerCase() === cleanLabel);
            if (exact) return exact;

            // 2. Normalized Match
            const normMatch = rowKeys.find(k => normalize(k) === normLabel);
            if (normMatch) return normMatch;

            // 3. Label contains Header
            const labelContains = rowKeys
              .filter(k => k.trim().length > 1 && cleanLabel.includes(k.trim().toLowerCase()))
              .sort((a, b) => b.length - a.length)[0];
            if (labelContains) return labelContains;

            // 4. Header contains Label
            const headerContains = rowKeys
              .filter(k => k.trim().toLowerCase().includes(cleanLabel))
              .sort((a, b) => a.length - b.length)[0];
            if (headerContains) return headerContains;

            return undefined;
          };

          missingColumns = fields.filter(f => !findBestMatch(f.label)).map(f => f.label);

          // Build debug map
          mappingDebug = fields.map(f => {
            const match = findBestMatch(f.label);
            return `${f.label} (${f.field_type}) -> ${match || '❌ NONE'}`;
          });
          console.log('Field Mapping & Types:', mappingDebug);

          // Execute Import
          await Promise.all(data.map(async (row: any, index: number) => {
            const entryData: Record<string, any> = {};
            let entryDate: Date | undefined = undefined;

            // Date Parsing
            const findKeyExact = (target: string) => rowKeys.find(k => k.trim().toLowerCase() === target.trim().toLowerCase());
            const dateKey = findKeyExact('Date') || findKeyExact('Timestamp') || findKeyExact('Waktu') || findKeyExact('Tanggal');
            const dateVal = dateKey ? row[dateKey] : undefined;

            if (dateVal instanceof Date) {
              entryDate = dateVal;
            } else if (dateVal) {
              const parsed = new Date(dateVal);
              if (!isNaN(parsed.getTime())) entryDate = parsed;
            }

            // Field Mapping
            let hasData = false;
            fields.forEach(field => {
              const matchedKey = findBestMatch(field.label);
              const cellVal = matchedKey ? row[matchedKey] : undefined;

              if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
                hasData = true;
                if (field.field_type === 'date' && cellVal instanceof Date) {
                  entryData[field.id] = format(cellVal, 'yyyy-MM-dd');
                } else if (field.field_type === 'checkbox') {
                  // Check if the value looks like a boolean or "yes/no"
                  const sVal = String(cellVal).trim();
                  const lowerVal = sVal.toLowerCase();

                  if (['yes', 'true', '1', 'ya', 'benar'].includes(lowerVal)) {
                    entryData[field.id] = true;
                  } else if (['no', 'false', '0', 'tidak', 'salah'].includes(lowerVal)) {
                    entryData[field.id] = false;
                  } else {
                    // Assume it's a multi-select value (e.g. "Area A" or "A, B")
                    // Split by comma if present
                    const values = sVal.split(',').map(v => v.trim()).filter(v => v);
                    entryData[field.id] = values;
                  }
                } else if ((field.field_type === 'image' || field.field_type === 'file') || typeof cellVal === 'string') {
                  // Relaxed check: valid string in File/Image field = Link
                  if ((field.field_type === 'image' || field.field_type === 'file')) {
                    entryData[field.id] = {
                      fileName: 'Link',
                      webViewLink: cellVal,
                      url: cellVal
                    };
                  } else {
                    entryData[field.id] = cellVal;
                  }
                } else {
                  entryData[field.id] = cellVal;
                }
              }
            });

            if (index === 0) {
              console.log('First Row Source:', row);
              console.log('First Row Parsed Entry Data:', entryData);
            }

            if (hasData) {
              await createEntry.mutateAsync({
                menu_id: menuId,
                data: entryData,
                created_at: entryDate
              });
              successCount++;
            }
          }));
        }

        toast.dismiss(toastId);
        if (successCount > 0) {
          toast.success(`Imported ${successCount} entries.`, {
            description: missingColumns.length > 0
              ? `Missing columns: ${missingColumns.join(', ')}`
              : 'All columns matched successfully.',
            duration: 5000,
          });
          // Show detailed mapping in console for the user to screenshot if needed
          console.log('Import Summary:', { successCount, mappingDebug, missingColumns });
        } else {
          toast.error('No valid entries imported.', {
            description: `Check headers. Detected: ${missingColumns.length ? 'Missing ' + missingColumns.join(', ') : 'None'}`,
          });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import file');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    // Filter by Date Range
    if (dateRange.from) {
      const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
      result = result.filter((entry) => {
        const entryTime = new Date(entry.created_at).getTime();
        return entryTime >= fromTime;
      });
    }

    if (dateRange.to) {
      const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);
      result = result.filter((entry) => {
        const entryTime = new Date(entry.created_at).getTime();
        return entryTime <= toTime;
      });
    }

    // Search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((entry) => {
        const dataStr = JSON.stringify(entry.data).toLowerCase();
        return dataStr.includes(searchLower);
      });
    }

    // Column Filters
    Object.entries(columnFilters).forEach(([fieldId, filterValue]) => {
      if (filterValue.trim()) {
        const lowerFilter = filterValue.toLowerCase();
        result = result.filter((entry) => {
          const val = entry.data[fieldId];

          if (Array.isArray(val)) {
            return val.join(', ').toLowerCase().includes(lowerFilter);
          }

          if (typeof val === 'boolean') {
            const boolStr = val ? 'yes' : 'no';
            return boolStr.includes(lowerFilter) || String(val).includes(lowerFilter);
          }

          if (typeof val === 'object' && val !== null) {
            const fileVal = val as { fileName?: string; url?: string; webViewLink?: string };
            const searchable = [fileVal.fileName, fileVal.url, fileVal.webViewLink].filter(Boolean).join(' ').toLowerCase();
            return searchable.includes(lowerFilter);
          }

          return String(val ?? '').toLowerCase().includes(lowerFilter);
        });
      }
    });

    // Sort
    result.sort((a, b) => {
      let aVal: unknown, bVal: unknown;

      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = a.data[sortField];
        bVal = b.data[sortField];
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [entries, search, sortField, sortDirection, dateRange, columnFilters]);

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text('Entries Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 14, 30);

    if (dateRange.from || dateRange.to) {
      const fromStr = dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start';
      const toStr = dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Now';
      doc.text(`Filter: ${fromStr} - ${toStr}`, 14, 38);
    }

    // Prepare Table Data
    const tableColumn = ['Date', ...fields.map(f => f.label)];
    const tableRows: any[] = [];

    filteredAndSortedEntries.forEach(entry => {
      const rowData = [
        format(new Date(entry.created_at), 'MMM d, yyyy HH:mm'),
        ...fields.map(field => {
          const val = entry.data[field.id];
          if (Array.isArray(val)) return val.join(', ');
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          if (typeof val === 'object' && val !== null) {
            const fileVal = val as { fileName?: string; webViewLink?: string };
            if (fileVal.webViewLink) {
              const label = field.field_type === 'image' ? 'View Image' : 'View File';
              return {
                content: label,
                url: fileVal.webViewLink,
                styles: { textColor: [0, 102, 204] } // Professional Blue
              };
            }
            return fileVal.fileName || '-';
          }
          return val ?? '-';
        })
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: dateRange.from || dateRange.to ? 45 : 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }, // Blue theme match
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const cellRaw = data.cell.raw as { content?: string; url?: string } | string;
          if (typeof cellRaw === 'object' && cellRaw?.url && cellRaw?.content) {
            const { x, y, width, height } = data.cell;
            // Link behavior
            doc.link(x, y, width, height, { url: cellRaw.url });

            // Draw underline
            const textWidth = doc.getTextWidth(cellRaw.content);
            // Approximate text position (x + padding, y + height/2 + delta)
            // Default autoTable padding is ~5px (scale factor involved but locally normalized)
            // A safe bet for underline is:
            const paddingX = 2; // consistent with default
            const lineX = x + paddingX; // Align with left padding
            // Align Y: data.cell.y + data.cell.height - paddingBottom
            // Let's try to put it relative to text baseline.
            // Text is vertically centered.
            const lineY = y + (height / 2) + 2; // Approximation

            doc.setDrawColor(0, 102, 204); // Blue
            doc.setLineWidth(0.5);
            doc.line(lineX, lineY, lineX + textWidth, lineY);
          }
        }
      }
    });

    doc.save('entries-report.pdf');
  };

  const exportToExcel = () => {
    // Headers
    const headers = ['Date', ...fields.map(f => f.label)];

    // Data Rows
    const data = filteredAndSortedEntries.map(entry => {
      return [
        format(new Date(entry.created_at), 'MMM d, yyyy HH:mm'),
        ...fields.map(field => {
          const val = entry.data[field.id];
          if (Array.isArray(val)) return val.join(', ');
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          if (typeof val === 'object' && val !== null) {
            const fileVal = val as { fileName?: string; webViewLink?: string; url?: string };
            if (fileVal.webViewLink) {
              // Create a cell with hyperLink
              return {
                v: field.field_type === 'image' ? 'View Image' : 'View File',
                l: { Target: fileVal.webViewLink },
                t: 's'
              };
            }
            return fileVal.fileName || '-';
          }
          return val ?? '-';
        })
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Auto-width
    const colWidths = headers.map((header, i) => {
      const maxContent = Math.max(
        header.length,
        ...data.map(row => {
          const cell = row[i];
          const cellContent = (cell && typeof cell === 'object' && 'v' in cell) ? String(cell.v) : String(cell ?? '');
          return cellContent.length;
        })
      );
      return { wch: Math.min(50, maxContent + 2) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entries");
    XLSX.writeFile(workbook, `entries-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const totalPages = Math.ceil(filteredAndSortedEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredAndSortedEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleDeleteConfirm = () => {
    if (deletingEntry) {
      deleteEntry.mutate(deletingEntry.id);
      setDeletingEntry(null);
    }
  };

  const renderCellValue = (field: FormField, value: unknown) => {
    if (value === undefined || value === null) return '-';

    switch (field.field_type) {
      case 'checkbox':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {v}
                </Badge>
              ))}
            </div>
          );
        }
        return value ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>;
      case 'file':
        const fileData = value as { fileName?: string; webViewLink?: string };
        if (fileData?.webViewLink) {
          return (
            <a
              href={fileData.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {fileData.fileName ?? 'View File'}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        return '-';
      case 'date':
        return typeof value === 'string' ? format(new Date(value), 'MMM d, yyyy') : String(value);
      case 'time':
        return String(value);
      case 'image':
        const imgData = value as { fileName?: string; webViewLink?: string; url?: string };
        if (imgData?.webViewLink) {
          return (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">{imgData.fileName}</span>
              <a
                href={imgData.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
              >
                View Image <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        }
        return '-';
      default:
        return String(value);
    }
  };

  if (fieldsLoading || entriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Entries</CardTitle>
          <CardDescription>View, search, and manage your submitted entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No form fields defined</h3>
            <p className="text-muted-foreground mt-2">
              Create form fields first to start collecting entries.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Entries</CardTitle>
                <CardDescription>
                  {filteredAndSortedEntries.length} entries total
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "justify-start text-left font-normal w-full sm:w-[240px]",
                    !dateRange.from && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDateRange({ from: undefined, to: undefined })}
                  className="shrink-0"
                  title="Clear date filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              <div className="flex-1"></div>

              <Button variant="outline" onClick={exportToPDF} disabled={filteredAndSortedEntries.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>

              <Button variant="outline" onClick={exportToExcel} disabled={filteredAndSortedEntries.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
              <Button variant="outline" onClick={handleImportClick} disabled={fields.length === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>

              <Button
                variant="destructive"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={entries.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No entries yet</h3>
              <p className="text-muted-foreground mt-2">
                Submit your first entry using the form.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.slice(0, 5).map((field) => (
                        <TableHead key={field.id}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-auto py-1 px-2"
                              onClick={() => handleSort(field.id)}
                            >
                              {field.label}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                  <Filter className={cn("h-3 w-3", columnFilters[field.id] ? "text-primary fill-primary/20" : "text-muted-foreground")} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-60 p-3" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Filter {field.label}</h4>
                                  <Input
                                    placeholder={`Filter ${field.label}...`}
                                    value={columnFilters[field.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setColumnFilters(prev => {
                                        const next = { ...prev, [field.id]: val };
                                        if (!val) delete next[field.id];
                                        return next;
                                      });
                                      setCurrentPage(1);
                                    }}
                                    className="h-8"
                                  />
                                  {columnFilters[field.id] && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setColumnFilters(prev => {
                                          const next = { ...prev };
                                          delete next[field.id];
                                          return next;
                                        });
                                        setCurrentPage(1);
                                      }}
                                      className="w-full h-7 text-xs"
                                    >
                                      Clear Filter
                                    </Button>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-auto py-1"
                          onClick={() => handleSort('created_at')}
                        >
                          Date
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        {fields.slice(0, 5).map((field) => (
                          <TableCell key={field.id} className="max-w-48 truncate">
                            {renderCellValue(field, entry.data[field.id])}
                          </TableCell>
                        ))}
                        <TableCell className="text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingEntry(entry)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {entries.length} entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAllEntries.mutate();
                setIsDeleteAllOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
