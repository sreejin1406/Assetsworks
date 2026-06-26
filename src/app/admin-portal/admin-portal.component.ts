import { Component, OnInit, OnDestroy } from '@angular/core';
import { TicketService } from '../ticket-service.service';
import { Subscription, forkJoin } from 'rxjs';
import { SignalRService } from '../signalr.service';

export type TicketStatus = 'Open' | 'InProgress' | 'Closed' | string;
export type Priority = 'Low' | 'Medium' | 'High' | string;
export type CommentChannel = 'client' | 'employee';

export interface Ticket {
  id: number;             // real backend primary key — used for status/assign API calls
  code: string;           // display ticket code (TCK-xxxx)
  device: string;
  issue: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  raisedBy: string;
  assignedToId: string;
  assignedTo: string;
  createdDate: Date | null;
  resolvedDate: Date | null;
}

export interface CommentEntry {
  author: string;
  text: string;
  time: Date;
}

interface DonutSegment {
  label: string;
  count: number;
  color: string;
  dashArray: string;
  dashOffset: string;
}

@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.component.html',
  styleUrls: ['./admin-portal.component.css']
})
export class AdminPortalComponent implements OnInit ,OnDestroy {

  // ---------- data ----------
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  users: any[] = [];

  // ---------- filters ----------
  statusFilter = '';
  priorityFilter = '';
  searchTerm = '';

statusOptions: TicketStatus[] = [
  'Open',
  'InProgress',
  'Closed',
  'Escalated'
];  priorityOptions: Priority[] = ['Low', 'Medium', 'High'];

  // ---------- pagination ----------
  currentPage = 1;
  pageSize = 8;

  // ---------- ui state ----------
  loading = false;
  errorMessage = '';

  // ---------- detail drawer ----------
  selectedTicket: Ticket | null = null;
  isDrawerOpen = false;
  activeThread: CommentChannel = 'client';
  clientComments: CommentEntry[] = [];
  employeeComments: CommentEntry[] = [];
  commentText = '';
  postingComment = false;

  private subs = new Subscription();

  constructor(private ticketService: TicketService, private signalRService: SignalRService) { }

 ngOnInit(): void {

  this.signalRService.startConnection();

  this.loadData();

  this.signalRService.ticketCreated.subscribe(() => {
    this.loadData();
  });

  this.signalRService.statusUpdated.subscribe(() => {
    this.loadData();
  });

  this.signalRService.commentAdded.subscribe(comment => {

    if (
        this.selectedTicket &&
        Number(comment.ticketId) === Number(this.selectedTicket.id)
    ) {

        this.loadComments(Number(this.selectedTicket.id));

    }

});

  this.signalRService.commentAdded.subscribe((comment: any) => {

    if (
      this.selectedTicket &&
      comment.ticketId === this.selectedTicket.id
    ) {
      this.loadComments(this.selectedTicket.id);
    }

  });

}

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // =====================================================
  // Loading
  // =====================================================

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.subs.add(
      forkJoin({
        tickets: this.ticketService.getAllTickets(),
        users: this.ticketService.getUsers()
      }).subscribe({
        next: (res: any) => {
          this.users = res.users || [];
          this.tickets = (res.tickets || []).map((raw: any) => this.mapTicket(raw));
          this.applyFilters();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to load admin dashboard data', err);
          this.errorMessage = 'Could not load tickets. Please try again.';
          this.loading = false;
        }
      })
    );
  }

  // .NET responses can come back camelCase or PascalCase — covers both.
  private mapTicket(raw: any): Ticket {
    const id = Number(raw.id ?? raw.Id ?? raw.ticketId ?? raw.TicketId ?? 0);
    const created = raw.createdDate ?? raw.CreatedDate ?? raw.createdAt ?? raw.CreatedAt ?? null;
    const resolved = raw.resolvedDate ?? raw.ResolvedDate ?? raw.closedDate ?? raw.ClosedDate ?? null;
  return {
  // Primary Key
  id: Number(
    raw.ticketId ??
    raw.TicketId ??
    raw.id ??
    raw.Id ??
    0
  ),

  // Ticket Number (Display)
  code: (
    raw.ticketNumber ??
    raw.TicketNumber ??
    raw.ticketCode ??
    raw.TicketCode ??
    (id ? `TKT-${id}` : '—')
  ).toString(),

  // Asset
  device:
    raw.model ??
    raw.Model ??
    raw.assetId ??
    raw.AssetId ??
    raw.device ??
    raw.Device ??
    '—',

  // Issue
  issue:
    raw.issueType ??
    raw.IssueType ??
    raw.issueTitle ??
    raw.IssueTitle ??
    '',

  // Description
  description:
    raw.issueDescription ??
    raw.IssueDescription ??
    raw.description ??
    raw.Description ??
    '',

  // Priority
  priority:
    raw.priority ??
    raw.Priority ??
    'Medium',

  // Status
  status:
    raw.status ??
    raw.Status ??
    'Open',

  // Raised By
  raisedBy:
    raw.raisedByName ??
    raw.RaisedByName ??
    raw.requestedByName ??
    raw.RequestedByName ??
    raw.raisedBy ??
    raw.RaisedBy ??
    'Unknown',

  // Assigned User Id
  assignedToId: (
    raw.assignedTo ??
    raw.AssignedTo ??
    ''
  ).toString(),

  // Assigned User Name
  assignedTo:
    raw.assignedToName ??
    raw.AssignedToName ??
    'Unassigned',

  // Dates
  createdDate:
    created ? new Date(created) : null,

  resolvedDate:
    resolved ? new Date(resolved) : null
};
  }

  userId(user: any): string {
    return (user.id ?? user.Id ?? user.userId ?? user.UserId ?? '').toString();
  }

  userName(user: any): string {
    return user.username ?? user.Username ?? user.name ?? user.Name ?? 'User';
  }

  // =====================================================
  // Filters / pagination
  // =====================================================

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredTickets = this.tickets.filter((t: Ticket) => {
      if (this.statusFilter && t.status !== this.statusFilter) { return false; }
      if (this.priorityFilter && t.priority !== this.priorityFilter) { return false; }
      if (term && !t.code.toLowerCase().includes(term)) { return false; }
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

  trackByTicketId(_index: number, ticket: Ticket): number {
    return ticket.id;
  }

  statusClass(status: TicketStatus): string {
    switch ((status || '').toLowerCase()) {
      case 'open': return 'badge-open';
      case 'inprogress': return 'badge-progress';
      case 'closed': return 'badge-closed';
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
  // Row actions — status change + assignment
  // =====================================================

  onStatusChange(ticket: Ticket, event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value;
    const previous = ticket.status;
    ticket.status = newStatus; // optimistic update

    this.subs.add(
      this.ticketService.updateStatus(ticket.id, newStatus).subscribe({
        next: () => { /* confirmed */ },
        error: (err: any) => {
          console.error('Failed to update status', err);
          ticket.status = previous; // roll back
        }
      })
    );
  }

  onAssignChange(ticket: Ticket, event: Event): void {
    const userIdValue = (event.target as HTMLSelectElement).value;
    if (!userIdValue) { return; }

    const previousId = ticket.assignedToId;
    const previousName = ticket.assignedTo;
    const matched = this.users.find((u: any) => this.userId(u) === userIdValue);

    ticket.assignedToId = userIdValue;
    ticket.assignedTo = matched ? this.userName(matched) : 'Assigned';

    this.subs.add(
      this.ticketService.assignTicket(
    ticket.id,
    userIdValue
).subscribe({
        next: () => { /* confirmed */ },
        error: (err: any) => {
          console.error('Failed to assign ticket', err);
          ticket.assignedToId = previousId;
          ticket.assignedTo = previousName;
        }
      })
    );
  }

  // =====================================================
  // Stats
  // =====================================================

  get statTotal(): number { return this.tickets.length; }
  get statOpen(): number { return this.countByStatus('Open'); }
  get statInProgress(): number { return this.countByStatus('InProgress'); }
  get statClosed(): number { return this.countByStatus('Closed'); }
  get statHighPriority(): number {
    return this.tickets.filter((t: Ticket) => (t.priority || '').toLowerCase() === 'high').length;
  }

  get statAvgResolution(): string {
    const resolved = this.tickets.filter((t: Ticket) => t.createdDate && t.resolvedDate);
    if (resolved.length === 0) { return '—'; }
    const totalHours = resolved.reduce((sum: number, t: Ticket) => {
      const hours = ((t.resolvedDate as Date).getTime() - (t.createdDate as Date).getTime()) / 36e5;
      return sum + hours;
    }, 0);
    const avgHours = totalHours / resolved.length;
    return avgHours < 48 ? `${avgHours.toFixed(1)}h` : `${(avgHours / 24).toFixed(1)}d`;
  }

  private countByStatus(status: string): number {
    return this.tickets.filter((t: Ticket) => (t.status || '').toLowerCase() === status.toLowerCase()).length;
  }

  // =====================================================
  // Distribution — status donut + priority mini-bars
  // (pure SVG / CSS, no chart library required)
  // =====================================================

  get statusDistribution(): DonutSegment[] {
    const total = this.tickets.length || 1;
    const circumference = 2 * Math.PI * 42;
    const groups: { label: string; count: number; color: string }[] = [
      { label: 'Open', count: this.statOpen, color: '#5EEAD4' },
      { label: 'InProgress', count: this.statInProgress, color: '#FBBF24' },
      { label: 'Closed', count: this.statClosed, color: '#7C8699' }
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

  get priorityBreakdown(): { label: string; count: number; pct: number; color: string }[] {
    const total = this.tickets.length || 1;
    const groups: { label: string; color: string }[] = [
      { label: 'High', color: '#FB7185' },
      { label: 'Medium', color: '#FBBF24' },
      { label: 'Low', color: '#5EEAD4' }
    ];
    return groups.map(g => {
      const count = this.tickets.filter((t: Ticket) => (t.priority || '').toLowerCase() === g.label.toLowerCase()).length;
      return { label: g.label, count, pct: Math.round((count / total) * 100), color: g.color };
    });
  }

  // =====================================================
  // Quick actions
  // =====================================================

  quickFilterUnassigned(): void {
    this.clearFilters();
    this.filteredTickets = this.tickets.filter((t: Ticket) => !t.assignedToId);
    this.currentPage = 1;
    this.scrollToTable();
  }

  quickFilterHighPriority(): void {
    this.clearFilters();
    this.priorityFilter = 'High';
    this.applyFilters();
    this.scrollToTable();
  }

  quickRefresh(): void {
    this.loadData();
  }

  private scrollToTable(): void {
    document.getElementById('ticket-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =====================================================
  // Detail drawer + two-way comment threads
  // =====================================================

  openTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.isDrawerOpen = true;
    this.activeThread = 'client';
    this.clientComments = [];
    this.employeeComments = [];
    this.commentText = '';
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.selectedTicket = null;
  }

  setThread(channel: CommentChannel): void {
    this.activeThread = channel;
    this.commentText = '';
  }

  get activeThreadComments(): CommentEntry[] {
    return this.activeThread === 'client' ? this.clientComments : this.employeeComments;
  }

postComment(): void {

  if (!this.selectedTicket || !this.commentText.trim()) {
    return;
  }

  const text = this.commentText.trim();
  const channel = this.activeThread;

  this.postingComment = true;

  this.ticketService.addComment({

    ticketId: Number(this.selectedTicket.id),

    comment: text,

    channel: channel

  }).subscribe({

    next: () => {

      const entry: CommentEntry = {
        author: 'You (Admin)',
        text,
        time: new Date()
      };

      if (channel === 'client') {
        this.clientComments = [
          ...this.clientComments,
          entry
        ];
      } else {
        this.employeeComments = [
          ...this.employeeComments,
          entry
        ];
      }

      this.commentText = '';

      // reload comments from DB
      this.loadComments(
        Number(this.selectedTicket?.id)
      );

      this.postingComment = false;
    },

    error: (err: any) => {

      console.error('Failed to post comment', err);

      this.postingComment = false;
    }
  });
}

loadComments(ticketId: number): void {

  this.ticketService
    .getComments(ticketId)
    .subscribe({

      next: (comments: any[]) => {

        this.clientComments = comments;

      },

      error: err => {

        console.error('Failed to load comments', err);

      }

    });
}

  // =====================================================
  // 3D tilt — physical-card depth on stat cards / quick actions
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
