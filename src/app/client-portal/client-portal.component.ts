import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from '../ticket-service.service';
import { Subscription, forkJoin } from 'rxjs';

export type TicketTab = 'repair' | 'new' | 'parts';
export type Priority = 'Low' | 'Medium' | 'High';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | string;

export interface CurrentUser {
  userId: string;
  username: string;
  email: string;
  mobile: string;
  role: string;
  location: string;
}

export interface Ticket {
  id: string;
  type: string;
  device: string;
  issue: string;
  description: string;
  priority: Priority | string;
  status: TicketStatus;
  assignedTo: string;
  createdDate: Date | null;
}

interface ActivityEntry {
  ticketId: string;
  label: string;
  timeAgo: string;
  status: TicketStatus;
}

interface DonutSegment {
  label: string;
  count: number;
  color: string;
  dashArray: string;
  dashOffset: string;
}

@Component({
  selector: 'app-client-portal',
  templateUrl: './client-portal.component.html',
  styleUrls: ['./client-portal.component.css']
})
export class ClientPortalComponent implements OnInit, OnDestroy {

  // ---------- tabs / forms ----------
  activeTab: TicketTab = 'repair';

  repairForm: FormGroup = this.fb.group({
    assetId: ['', Validators.required],
    issueTitle: ['', Validators.required],
    description: ['', Validators.required],
    priority: ['Medium' as Priority, Validators.required]
  });

  newForm: FormGroup = this.fb.group({
    assetType: ['Laptop', Validators.required],
    model: ['', Validators.required],
    specification: [''],
    qty: [1, [Validators.required, Validators.min(1)]]
  });

  partsForm: FormGroup = this.fb.group({
    partsType: ['Hardware', Validators.required],
    partName: ['', Validators.required],
    model: [''],
    qty: [1, [Validators.required, Validators.min(1)]]
  });

  selectedFile: File | null = null;
  assetTypes: string[] = ['Laptop', 'Desktop', 'Monitor'];
  partsTypes: string[] = ['Hardware', 'Cable', 'Battery', 'Accessory', 'Other'];
  priorities: Priority[] = ['Low', 'Medium', 'High'];

  // ---------- current user (autofetch block) ----------
  currentUser: CurrentUser = { userId: '', username: '', email: '', mobile: '', role: '', location: '' };

  // ---------- tickets ----------
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
selectedTicketComments: any[] = [];


  // ---------- filters ----------
  statusFilter = '';
  priorityFilter = '';
  searchTerm = '';

  // ---------- pagination ----------
  currentPage = 1;
  pageSize = 8;

  // ---------- ui state ----------
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  // ---------- detail drawer ----------
  selectedTicket: Ticket | null = null;
  isDrawerOpen = false;
  commentText = '';
  postingComment = false;

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // =====================================================
  // Loading
  // =====================================================

  private loadCurrentUser(): void {
    const decoded = this.decodeToken();
    this.currentUser = {

  userId:
    decoded.UserId ||
    decoded.userId ||
    '',

  username:
    decoded.UserName ||
    decoded.userName ||
    '',

  email:
    decoded.Email ||
    decoded.email ||
    '',

  mobile:
    decoded.Mobile ||
    decoded.mobile ||
    '',

  role:
    decoded.Role ||
    decoded.role ||
    '',

  location:
    decoded.Location ||
    decoded.location ||
    ''
};

    // Enrich with the full profile from /ticket/users if it's available there,
    // since the JWT usually only carries id/name/email/role.
    this.subs.add(
      this.ticketService.getUsers().subscribe({
        next: (users: any[]) => {
          const match = (users || []).find((u: any) =>
            (u.id ?? u.Id ?? u.userId ?? u.UserId)?.toString() === this.currentUser.userId?.toString()
          );
          if (match) {
            this.currentUser = {
              userId: (match.id ?? match.Id ?? match.userId ?? match.UserId ?? this.currentUser.userId).toString(),
              username: match.username ?? match.Username ?? match.name ?? this.currentUser.username,
              email: match.email ?? match.Email ?? this.currentUser.email,
              mobile: match.mobile ?? match.Mobile ?? match.phone ?? this.currentUser.mobile,
              role: match.role ?? match.Role ?? this.currentUser.role,
              location: match.location ?? match.Location ?? this.currentUser.location
            };
          }
        },
        error: (err: any) => console.error('Could not load user directory', err)
      })
    );
  }

  private decodeToken(): any {
    try {
      const token = localStorage.getItem('token');
      if (!token) { return {}; }
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return {};
    }
  }

  loadTickets(): void {
    this.loading = true;
    this.errorMessage = '';
    this.subs.add(
      this.ticketService.getMyTickets().subscribe({
        next: (data: any[]) => {
          this.tickets = (data || []).map((raw: any) => this.mapTicket(raw));
          this.applyFilters();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to load tickets', err);
          this.errorMessage = 'Could not load your tickets. Please try again.';
          this.loading = false;
        }
      })
    );
  }

  // .NET responses can come back camelCase or PascalCase — covers both.
  private mapTicket(raw: any): Ticket {
    const created = raw.createdDate ?? raw.CreatedDate ?? raw.createdAt ?? raw.CreatedAt ?? null;
    return {
      id: (raw.ticketCode ?? raw.TicketCode ?? raw.id ?? raw.Id ?? raw.ticketId ?? raw.TicketId ?? '').toString(),
      type: raw.type ?? raw.Type ?? raw.category ?? raw.Category ?? 'Repair',
      device: raw.device ?? raw.Device ?? raw.assetId ?? raw.AssetId ?? raw.model ?? raw.Model ?? '—',
      issue: raw.issueTitle ?? raw.IssueTitle ?? raw.title ?? raw.Title ?? raw.issue ?? raw.Issue ?? '',
      description: raw.description ?? raw.Description ?? '',
      priority: raw.priority ?? raw.Priority ?? 'Medium',
      status: raw.status ?? raw.Status ?? 'Open',
      assignedTo: raw.assignedTo ?? raw.AssignedTo ?? raw.assignedToName ?? raw.AssignedToName ?? 'Unassigned',
      createdDate: created ? new Date(created) : null
    };
  }

  // =====================================================
  // Tabs
  // =====================================================

  switchTab(tab: TicketTab): void {
    if (this.activeTab === tab) { return; }
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  setPriority(priority: Priority): void {
    this.repairForm.get('priority')?.setValue(priority);
  }

  get activeForm(): FormGroup {
    if (this.activeTab === 'repair') { return this.repairForm; }
    if (this.activeTab === 'new') { return this.newForm; }
    return this.partsForm;
  }

  // =====================================================
  // Create ticket
  // =====================================================

  // onCreateTicket(): void {
  //   const form = this.activeForm;
  //   if (form.invalid) {
  //     form.markAllAsTouched();
  //     return;
  //   }

  //   this.submitting = true;
  //   this.successMessage = '';
  //   this.errorMessage = '';

  //   const basePayload: any = {
  //     type: this.activeTab === 'repair' ? 'Repair' : this.activeTab === 'new' ? 'New' : 'Parts',
  //     requestedBy: this.currentUser.userId,
  //     requestedByName: this.currentUser.username,
  //     requestedByEmail: this.currentUser.email,
  //     requestedByLocation: this.currentUser.location,
  //     ...form.value
  //   };

  //   let payload: any = basePayload;

  //   if (this.activeTab === 'parts' && this.selectedFile) {
  //     const formData = new FormData();
  //     Object.keys(basePayload).forEach((key: string) => formData.append(key, basePayload[key]));
  //     formData.append('attachment', this.selectedFile, this.selectedFile.name);
  //     payload = formData;
  //   }

  //   this.subs.add(
  //     this.ticketService.createTicket(payload).subscribe({
  //       next: () => {
  //         this.successMessage = 'Ticket raised successfully.';
  //         this.submitting = false;
  //         this.resetActiveForm();
  //         this.loadTickets();
  //       },
  //       error: (err: any) => {
  //         console.error('Failed to create ticket', err);
  //         this.errorMessage = 'Could not create the ticket. Please try again.';
  //         this.submitting = false;
  //       }
  //     })
  //   );
  // }


onCreateTicket(): void {

  const form = this.activeForm;

  if (form.invalid) {
    form.markAllAsTouched();
    return;
  }

  this.submitting = true;
  this.successMessage = '';
  this.errorMessage = '';

  const formData = new FormData();

  // Repair Ticket

  formData.append(
    'assetId',
    this.repairForm.value.assetId
  );

  formData.append(
    'issueTitle',
    this.repairForm.value.issueTitle
  );

  formData.append(
    'issueDescription',
    this.repairForm.value.description
  );

  formData.append(
    'priority',
    this.repairForm.value.priority
  );

  // Optional Attachment

  if (this.selectedFile) {

    formData.append(
      'attachment',
      this.selectedFile,
      this.selectedFile.name
    );

  }

  this.subs.add(

    this.ticketService.createTicket(formData)

      .subscribe({

        next: (res: any) => {

          this.successMessage =
            'Ticket raised successfully.';

          this.submitting = false;

          this.resetActiveForm();

          this.loadTickets();
        },

        error: (err: any) => {

          console.error(
            'Failed to create ticket',
            err
          );

          console.log(
            err.error
          );

          this.errorMessage =
            err?.error?.title ||
            'Could not create the ticket. Please try again.';

          this.submitting = false;
        }

      })

  );

}

  private resetActiveForm(): void {
    if (this.activeTab === 'repair') {
      this.repairForm.reset({ assetId: '', issueTitle: '', description: '', priority: 'Medium' });
    } else if (this.activeTab === 'new') {
      this.newForm.reset({ assetType: 'Laptop', model: '', specification: '', qty: 1 });
    } else {
      this.partsForm.reset({ partsType: 'Hardware', partName: '', model: '', qty: 1 });
      this.selectedFile = null;
    }
  }

  // =====================================================
  // Filters / pagination
  // =====================================================

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredTickets = this.tickets.filter((t: Ticket) => {
      if (this.statusFilter && t.status !== this.statusFilter) { return false; }
      if (this.priorityFilter && t.priority !== this.priorityFilter) { return false; }
      if (term && !t.id.toLowerCase().includes(term)) { return false; }
      return true;
    });
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  get pagedTickets(): Ticket[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTickets.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTickets.length / this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) { return; }
    this.currentPage = page;
  }

  trackByTicketId(_index: number, ticket: Ticket): string {
    return ticket.id;
  }

  statusClass(status: TicketStatus): string {
    switch ((status || '').toLowerCase()) {
      case 'open': return 'badge-open';
      case 'in progress': return 'badge-progress';
      case 'resolved': return 'badge-resolved';
      default: return 'badge-default';
    }
  }

  priorityClass(priority: string): string {
    switch ((priority || '').toLowerCase()) {
      case 'low': return 'badge-low';
      case 'medium': return 'badge-medium';
      case 'high': return 'badge-high';
      default: return 'badge-default';
    }
  }

  // =====================================================
  // Stats
  // =====================================================

  get statTotal(): number { return this.tickets.length; }
  get statOpen(): number { return this.countByStatus('Open'); }
  get statInProgress(): number { return this.countByStatus('In Progress'); }
  get statResolved(): number { return this.countByStatus('Resolved'); }

  private countByStatus(status: string): number {
    return this.tickets.filter((t: Ticket) => (t.status || '').toLowerCase() === status.toLowerCase()).length;
  }

  // =====================================================
  // Distribution donut (pure SVG, no chart library required)
  // =====================================================

  get distribution(): DonutSegment[] {
    const total = this.tickets.length || 1;
    const circumference = 2 * Math.PI * 42; // r = 42
    const groups: { label: string; count: number; color: string }[] = [
      { label: 'Open', count: this.statOpen, color: '#5EEAD4' },
      { label: 'In Progress', count: this.statInProgress, color: '#FBBF24' },
      { label: 'Resolved', count: this.statResolved, color: '#7C8699' }
    ];

    let offset = 0;
    return groups.map(g => {
      const fraction = g.count / total;
      const dash = fraction * circumference;
      const segment: DonutSegment = {
        label: g.label,
        count: g.count,
        color: g.color,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: `${-offset}`
      };
      offset += dash;
      return segment;
    });
  }

  // =====================================================
  // Recent activity (derived from ticket list as a stand-in
  // for a dedicated activity-log endpoint)
  // =====================================================

  get recentActivity(): ActivityEntry[] {
    return [...this.tickets]
      .filter((t: Ticket) => !!t.createdDate)
      .sort((a: Ticket, b: Ticket) => (b.createdDate as Date).getTime() - (a.createdDate as Date).getTime())
      .slice(0, 6)
      .map((t: Ticket) => ({
        ticketId: t.id,
        label: `${t.issue || t.type} · ${t.device}`,
        timeAgo: this.timeAgo(t.createdDate as Date),
        status: t.status
      }));
  }

  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) { return 'just now'; }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) { return `${minutes}m ago`; }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) { return `${hours}h ago`; }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // =====================================================
  // Detail drawer + comments
  // =====================================================

openTicket(ticket: Ticket): void {

  this.selectedTicket = ticket;

  this.isDrawerOpen = true;

  this.commentText = '';

  this.loadComments(Number(ticket.id));
}

loadComments(ticketId: number) {

  this.ticketService.getComments(ticketId)
    .subscribe(comments => {

      this.selectedTicketComments = comments;

    });

}

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.selectedTicket = null;
  }

  postComment(): void {
    if (!this.selectedTicket || !this.commentText.trim()) { return; }
    this.postingComment = true;
    this.subs.add(
      this.ticketService.addComment({
        ticketId: this.selectedTicket.id,
        comment: this.commentText.trim(),
commentedBy: this.currentUser.username
      }).subscribe({
        next: () => {
          this.commentText = '';
          this.postingComment = false;
        },
        error: (err: any) => {
          console.error('Failed to post comment', err);
          this.postingComment = false;
        }
      })
    );
  }

  // =====================================================
  // 3D tilt — used on the stat cards + ticket creation panel
  // ("physical card" depth: tilt + a light sheen that follows the cursor)
  // =====================================================

  onTiltMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    target.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
    target.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    target.style.setProperty('--sheen-angle', `${90 + px * 70}deg`);
  }

  onTiltLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.setProperty('--rx', `0deg`);
    target.style.setProperty('--ry', `0deg`);
  }
}
