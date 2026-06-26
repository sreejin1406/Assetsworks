import { Component, OnInit, OnDestroy } from '@angular/core';
import { TicketService } from '../ticket-service.service';
import { Subscription } from 'rxjs';
import { SignalRService } from '../signalr.service';

export type TicketStatus = 'Open' | 'In Progress' | 'Closed' | string;
export type Priority = 'Low' | 'Medium' | 'High' | string;

export interface Ticket {
  id: number;
  code: string;
  device: string;
  issue: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  raisedBy: string;
  createdDate: Date | null;
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
  selector: 'app-employee-portal',
  templateUrl: './employee-portal.component.html',
  styleUrls: ['./employee-portal.component.css']
})
export class EmployeePortalComponent implements OnInit, OnDestroy {

  // ---------- data ----------
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];

  // ---------- filters ----------
  statusFilter = '';
  priorityFilter = '';
  searchTerm = '';
  statusOptions: TicketStatus[] = ['Open', 'In Progress', 'Closed'];
  priorityOptions: Priority[] = ['Low', 'Medium', 'High'];

  // ---------- pagination ----------
  currentPage = 1;
  pageSize = 8;

  // ---------- ui state ----------
  loading = false;
  errorMessage = '';

  // ---------- animated stat counters ----------
  animTotal = 0;
  animOpen = 0;
  animInProgress = 0;
  animClosed = 0;
  private animFrameId: number | null = null;

  // ---------- detail drawer ----------
  selectedTicket: Ticket | null = null;
  isDrawerOpen = false;
  comments: CommentEntry[] = [];
  commentText = '';
  postingComment = false;

  private subs = new Subscription();

  constructor(
    private ticketService: TicketService,
    private signalRService: SignalRService
) { }

  ngOnInit(): void {

    this.signalRService.startConnection();

    this.loadTickets();

    this.signalRService.ticketAssigned.subscribe(() => {

        this.loadTickets();

    });

    this.signalRService.statusUpdated.subscribe(() => {

        this.loadTickets();

    });

    this.signalRService.commentAdded.subscribe((comment: any) => {

        if (
            this.selectedTicket &&
            Number(comment.ticketId) === Number(this.selectedTicket.id)
        ) {

            this.loadComments(this.selectedTicket.id);

        }

    });

}

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); }
  }

  // =====================================================
  // Loading
  // =====================================================

  loadTickets(): void {
    this.loading = true;
    this.errorMessage = '';
    this.subs.add(
      this.ticketService.getAssignedTickets().subscribe({
        next: (data: any[]) => {
          this.tickets = (data || []).map((raw: any) => this.mapTicket(raw));
          this.applyFilters();
          this.animateStats();
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to load assigned tickets', err);
          this.errorMessage = 'Could not load your assigned tickets. Please try again.';
          this.loading = false;
        }
      })
    );
  }

  private mapTicket(raw: any): Ticket {
    const id = Number(raw.id ?? raw.Id ?? raw.ticketId ?? raw.TicketId ?? 0);
    const created = raw.createdDate ?? raw.CreatedDate ?? raw.createdAt ?? raw.CreatedAt ?? null;
    return {
      id,
      code: (raw.ticketCode ?? raw.TicketCode ?? raw.code ?? (id ? `TCK-${id}` : '—')).toString(),
      device: raw.device ?? raw.Device ?? raw.assetId ?? raw.AssetId ?? raw.model ?? raw.Model ?? '—',
      issue: raw.issueTitle ?? raw.IssueTitle ?? raw.title ?? raw.Title ?? raw.issue ?? raw.Issue ?? '',
      description: raw.description ?? raw.Description ?? '',
      priority: raw.priority ?? raw.Priority ?? 'Medium',
      status: raw.status ?? raw.Status ?? 'Open',
      raisedBy: raw.requestedByName ?? raw.RequestedByName ?? raw.raisedBy ?? raw.RaisedBy ?? raw.clientName ?? raw.ClientName ?? 'Unknown',
      createdDate: created ? new Date(created) : null
    };
  }

  loadComments(ticketId: number): void {

    this.ticketService.getComments(ticketId)
        .subscribe((comments: any[]) => {

            this.comments = comments.map(c => ({
                author: c.commentedByName,
                text: c.comment,
                time: new Date(c.createdDate)
            }));

        });

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
      case 'in progress': return 'badge-progress';
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
  // Status update (the employee's primary action on a ticket)
  // =====================================================

  onStatusChange(ticket: Ticket, event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value;
    const previous = ticket.status;
    ticket.status = newStatus; // optimistic update

    this.subs.add(
      this.ticketService.updateStatus(ticket.id, newStatus).subscribe({
        next: () => { this.animateStats(); },
        error: (err: any) => {
          console.error('Failed to update status', err);
          ticket.status = previous;
        }
      })
    );
  }

  // =====================================================
  // Stats (raw + animated count-up display values)
  // =====================================================

  get statTotal(): number { return this.tickets.length; }
  get statOpen(): number { return this.countByStatus('Open'); }
  get statInProgress(): number { return this.countByStatus('In Progress'); }
  get statClosed(): number { return this.countByStatus('Closed'); }

  private countByStatus(status: string): number {
    return this.tickets.filter((t: Ticket) => (t.status || '').toLowerCase() === status.toLowerCase()).length;
  }

  private animateStats(): void {
    const targets = { total: this.statTotal, open: this.statOpen, inProgress: this.statInProgress, closed: this.statClosed };
    const duration = 700;
    const start = performance.now();
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); }

    const step = (now: number): void => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.animTotal = Math.round(targets.total * eased);
      this.animOpen = Math.round(targets.open * eased);
      this.animInProgress = Math.round(targets.inProgress * eased);
      this.animClosed = Math.round(targets.closed * eased);
      if (t < 1) { this.animFrameId = requestAnimationFrame(step); }
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  // =====================================================
  // Distribution donut (pure SVG, no chart library)
  // =====================================================

  get distribution(): DonutSegment[] {
    const total = this.tickets.length || 1;
    const circumference = 2 * Math.PI * 42;
    const groups: { label: string; count: number; color: string }[] = [
      { label: 'Open', count: this.statOpen, color: '#5EEAD4' },
      { label: 'In Progress', count: this.statInProgress, color: '#FBBF24' },
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

  // =====================================================
  // Recent assigned tickets (horizontal feed)
  // =====================================================

  get recentAssigned(): Ticket[] {
    return [...this.tickets]
      .filter((t: Ticket) => !!t.createdDate)
      .sort((a: Ticket, b: Ticket) => (b.createdDate as Date).getTime() - (a.createdDate as Date).getTime())
      .slice(0, 6);
  }

  timeAgo(date: Date | null): string {
    if (!date) { return '—'; }
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
  // Quick actions
  // =====================================================

  quickFilterOpen(): void {
    this.clearFilters();
    this.statusFilter = 'Open';
    this.applyFilters();
    this.scrollToTable();
  }

  quickFilterInProgress(): void {
    this.clearFilters();
    this.statusFilter = 'In Progress';
    this.applyFilters();
    this.scrollToTable();
  }

  quickFilterClosed(): void {
    this.clearFilters();
    this.statusFilter = 'Closed';
    this.applyFilters();
    this.scrollToTable();
  }

  quickRefresh(): void {
    this.loadTickets();
  }

  private scrollToTable(): void {
    document.getElementById('ticket-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =====================================================
  // Detail drawer + employee → admin comments
  // =====================================================

  openTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.isDrawerOpen = true;
   this.loadComments(ticket.id);
    this.commentText = '';
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.selectedTicket = null;
  }

  postComment(): void {
    if (!this.selectedTicket || !this.commentText.trim()) { return; }
    const text = this.commentText.trim();
    this.postingComment = true;

    this.subs.add(
      // 'employee' is the same channel tag used by the Admin Dashboard's
      // "To Employee" thread, so both sides are writing to one conversation
      // once the backend persists/filters comments by this field.
      this.ticketService.addComment({
        ticketId: this.selectedTicket.id,
        comment: text,
        channel: 'employee'
      }).subscribe({
       next: () => {

    this.commentText='';

    this.postingComment=false;

    this.loadComments(this.selectedTicket!.id);

},
        error: (err: any) => {
          console.error('Failed to post comment', err);
          this.postingComment = false;
        }
      })
    );
  }

  // =====================================================
  // 3D tilt — physical-card depth
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
    target.style.setProperty('--mx', `${x}px`);
    target.style.setProperty('--my', `${y}px`);
  }

  onTiltLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.setProperty('--rx', `0deg`);
    target.style.setProperty('--ry', `0deg`);
  }
}
