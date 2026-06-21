import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AssetdetailsService } from '../assetdetails.service';

import * as FileSaver from 'file-saver';

// 'xlsx' and 'jspdf' / 'jspdf-autotable' are not bundled with Angular by default.
// Install them once: npm install xlsx jspdf jspdf-autotable --save
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type AssetStatus = 'Rent' | 'Repair' | 'Sale' | string;

export interface Asset {
  assetId: string;
  model: string;
  serialNumber: string;
  clientsDetails: string;
  status: AssetStatus;
  date: Date | null;
  specification: string;
  dispatchedDetails: string;
  receiverDetails: string;
  location: string;
}

interface StatusCounts {
  rent: number;
  repair: number;
  sold: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // ---------- data ----------
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];

  clients: string[] = [];
  models: string[] = [];
  statusOptions: string[] = [];

  // ---------- filters ----------
  selectedClient = '';
  selectedModel = '';
  selectedStatus = '';
  searchTerm = '';
  fromDate = '';
  toDate = '';
  private searchSubject = new Subject<string>();

  // ---------- status summary ----------
  statusCounts: StatusCounts = { rent: 0, repair: 0, sold: 0 };

  // ---------- pagination ----------
  currentPage = 1;
  pageSize = 10;

  // ---------- ui state ----------
  loading = false;
  errorMessage = '';
  isNotificationOpen = false;
  isProfileOpen = false;
  notifications: { title: string; time: string }[] = [];
  userName = 'User';
  userInitial = 'U';

  private subs = new Subscription();

  constructor(
    private assetService: AssetdetailsService,
    private router: Router,
    private hostRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.userName = this.resolveUserName();
    this.userInitial = this.userName.charAt(0).toUpperCase();

    this.loadFilterOptions();
    this.loadAssets();

    this.subs.add(
      this.searchSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.applyFilters())
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.searchSubject.complete();
  }

  // ---------- data loading ----------

  loadAssets(): void {
    this.loading = true;
    this.errorMessage = '';
    this.subs.add(
      this.assetService.getAllAssets().subscribe({
        next: (data) => {
this.assets = (data || []).map((raw: any) => this.mapAsset(raw));          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load assets', err);
          this.errorMessage = 'Could not load asset records. Please try again.';
          this.loading = false;
        }
      })
    );
  }

  loadFilterOptions(): void {
    this.subs.add(
      forkJoin({
        clients: this.assetService.getClients(),
        models: this.assetService.getModels(),
        status: this.assetService.getStatus()
      }).subscribe({
        next: (res: any) => {
          this.clients = this.normalizeList(res.clients);
          this.models = this.normalizeList(res.models);
          this.statusOptions = this.normalizeList(res.status);
        },
        error: (err) => console.error('Failed to load filter options', err)
      })
    );
  }

  // API responses can come back as ['Acme Corp', ...] or [{ name: 'Acme Corp' }, ...]
  // depending on backend shape — this keeps the dropdowns working either way.
  private normalizeList(list: any[]): string[] {
    if (!Array.isArray(list)) { return []; }
    return list.map(item =>
      typeof item === 'string' ? item : (item?.name ?? item?.Name ?? item?.value ?? item?.Value ?? '')
    ).filter(Boolean);
  }

  // .NET APIs can serialize either camelCase or PascalCase — this maps both
  // so the table works regardless of how GetAll() responds.
  private mapAsset(raw: any): Asset {
    const rawDate = raw.date ?? raw.Date ?? raw.createdDate ?? raw.CreatedDate ?? null;
    return {
      assetId: raw.assetId ?? raw.AssetId ?? raw.asset_id ?? '',
      model: raw.model ?? raw.Model ?? '',
      serialNumber: raw.serialNumber ?? raw.SerialNumber ?? raw.serial_number ?? '',
      clientsDetails: raw.clientsDetails ?? raw.clientsDetails ?? raw.clientName ?? raw.ClientName ?? '',
      status: raw.status ?? raw.Status ?? '',
      date: rawDate ? new Date(rawDate) : null,
      specification: raw.specification ?? raw.Specification ?? '',
      dispatchedDetails: raw.dispachedDetails ?? raw.dispatchedDetails ?? raw.DispatchedDetails ?? raw.DispachedDetails ?? '',
      receiverDetails: raw.reciverDetails ?? raw.receiverDetails ?? raw.ReceiverDetails ?? raw.ReciverDetails ?? '',
      location: raw.location ?? raw.Location ?? ''
    };
  }

  // ---------- filtering ----------

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  filterByStatus(status: AssetStatus): void {
    this.selectedStatus = this.selectedStatus === status ? '' : status;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    this.filteredAssets = this.assets.filter(asset => {
      if (this.selectedClient && asset.clientsDetails !== this.selectedClient) { return false; }
      if (this.selectedModel && asset.model !== this.selectedModel) { return false; }
      if (this.selectedStatus && asset.status !== this.selectedStatus) { return false; }

      if (term) {
        const haystack = `${asset.assetId} ${asset.serialNumber} ${asset.clientsDetails} ${asset.model} ${asset.location}`.toLowerCase();
        if (!haystack.includes(term)) { return false; }
      }

      if (from && (!asset.date || asset.date < from)) { return false; }
      if (to && (!asset.date || asset.date > to)) { return false; }

      return true;
    });

    this.recomputeStatusCounts();
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.selectedClient = '';
    this.selectedModel = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.applyFilters();
  }

  private recomputeStatusCounts(): void {
    const counts: StatusCounts = { rent: 0, repair: 0, sold: 0 };
    for (const asset of this.filteredAssets) {
      const status = (asset.status || '').toLowerCase();
      if (status === 'rent') { counts.rent++; }
      else if (status === 'repair') { counts.repair++; }
      else if (status === 'sold') { counts.sold++; }
    }
    this.statusCounts = counts;
  }

  statusClass(status: AssetStatus): string {
    switch ((status || '').toLowerCase()) {
      case 'rent': return 'badge-rent';
      case 'repair': return 'badge-repair';
      case 'sale': return 'badge-sale';
      default: return 'badge-default';
    }
  }

  trackByAssetId(_index: number, asset: Asset): string {
    return asset.assetId;
  }

  // ---------- pagination ----------

  get pagedAssets(): Asset[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAssets.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAssets.length / this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) { return; }
    this.currentPage = page;
  }

  // ---------- 3D tilt + mouse-follow glow ----------
  // Applied to .tilt-card elements (filter bar, status cards). Sets CSS custom
  // properties that the stylesheet reads for rotation + glow position.

  onTiltMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;
    const rotateY = (px - 0.5) * 12;
    const rotateX = (0.5 - py) * 12;

    target.style.setProperty('--rx', `${rotateX}deg`);
    target.style.setProperty('--ry', `${rotateY}deg`);
    target.style.setProperty('--mx', `${x}px`);
    target.style.setProperty('--my', `${y}px`);
  }

  onTiltLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.setProperty('--rx', `0deg`);
    target.style.setProperty('--ry', `0deg`);
  }

  // ---------- nav / profile ----------

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationOpen = !this.isNotificationOpen;
    this.isProfileOpen = false;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
    this.isNotificationOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-right')) {
      this.isNotificationOpen = false;
      this.isProfileOpen = false;
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  private resolveUserName(): string {
    try {
      const token = localStorage.getItem('token');
      if (!token) { return 'User'; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.name || payload.unique_name || payload.email || payload.sub || 'User';
    } catch {
      return 'User';
    }
  }

  // ---------- export ----------

 exportToExcel(): void {

  const rows = this.filteredAssets.map(a => this.toExportRow(a));

  if (!rows.length) {
    return;
  }

  const worksheet: XLSX.WorkSheet =
    XLSX.utils.json_to_sheet(rows);

  const workbook: XLSX.WorkBook = {
    Sheets: { Assets: worksheet },
    SheetNames: ['Assets']
  };

  const excelBuffer: any = XLSX.write(
    workbook,
    {
      bookType: 'xlsx',
      type: 'array'
    }
  );

  let fileName = 'Assets_Report';

  if (this.selectedModel) {
    fileName = `${this.selectedModel}_report`;
  }

  const data: Blob = new Blob(
    [excelBuffer],
    {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    }
  );

  FileSaver.saveAs(data, `${fileName}.xlsx`);
}

  exportToPDF(): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Asset Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Asset ID', 'Model', 'Serial No.', 'Client', 'Status', 'Date', 'Specification', 'Dispatched', 'Receiver', 'Location']],
      body: this.filteredAssets.map(a => [
        a.assetId, a.model, a.serialNumber, a.clientsDetails, a.status,
        a.date ? this.formatDate(a.date) : '', a.specification,
        a.dispatchedDetails, a.receiverDetails, a.location
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [10, 14, 23] },
      alternateRowStyles: { fillColor: [242, 246, 250] }
    });
    doc.save(`Assets_${this.timestamp()}.pdf`);
  }

  exportToWord(): void {
    const headers = ['Asset ID', 'Model', 'Serial Number', 'Client Details', 'Status', 'Date', 'Specification', 'Dispatched Details', 'Receiver Details', 'Location'];
    const rowsHtml = this.filteredAssets.map(a => `
      <tr>
        <td>${this.escapeHtml(a.assetId)}</td>
        <td>${this.escapeHtml(a.model)}</td>
        <td>${this.escapeHtml(a.serialNumber)}</td>
        <td>${this.escapeHtml(a.clientsDetails)}</td>
        <td>${this.escapeHtml(a.status)}</td>
        <td>${a.date ? this.formatDate(a.date) : ''}</td>
        <td>${this.escapeHtml(a.specification)}</td>
        <td>${this.escapeHtml(a.dispatchedDetails)}</td>
        <td>${this.escapeHtml(a.receiverDetails)}</td>
        <td>${this.escapeHtml(a.location)}</td>
      </tr>`).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Asset Report</title></head>
      <body>
        <h2>Asset Report</h2>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial;font-size:11px;">
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    this.downloadBlob(blob, `Assets_${this.timestamp()}.doc`);
  }

  private toExportRow(a: Asset) {
    return {
      'Asset ID': a.assetId,
      'Model': a.model,
      'Serial Number': a.serialNumber,
      'Client Details': a.clientsDetails,
      'Status': a.status,
      'Date': a.date ? this.formatDate(a.date) : '',
      'Specification': a.specification,
      'Dispatched Details': a.dispatchedDetails,
      'Receiver Details': a.receiverDetails,
      'Location': a.location
    };
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  private timestamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private escapeHtml(value: string): string {
    return (value ?? '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
