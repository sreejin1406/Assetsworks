import { Component, OnInit } from '@angular/core';
import { TicketService } from '../ticket-service.service';

@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.component.html',
  styleUrls: ['./admin-portal.component.css']
})
export class AdminPortalComponent implements OnInit {

  tickets: any[] = [];
  filteredTickets: any[] = [];
newTicketCount = 0;

previousTicketCount = 0;

audio = new Audio('assets/notification.mp3');


  stats: any = {
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    highPriority: 0,
    thisWeek: 0,
    avgResolution: 24
  };

  filters: any = {
    status: '',
    priority: '',
    assignedTo: '',
    search: ''
  };

  showAssignModal = false;
  selectedTicketId!: number;
  selectedUserId = 0;

  users: any[] = []; // 👉 Load from API if available

  selectedTicket: any;
  showTicketModal = false;
  newComment = '';

  constructor(private api: TicketService) {}

  ngOnInit(): void {

   this.loadAllTickets();

   this.loadUsers();

   setInterval(() => {

      this.loadAllTickets();

   }, 5000);
}

  loadUsers() {

  this.api.getUsers().subscribe({

    next: (res:any) => {

      console.log('Users:', res);

      this.users = res;
    },

    error: (err) => {

      console.log(err);
    }

  });
}

  loadAllTickets() {

  this.api.getAllTickets().subscribe((res: any) => {

    // detect new ticket
    if (this.previousTicketCount > 0 && res.length > this.previousTicketCount) {

      this.newTicketCount++;

      // play sound
      this.audio.play();

      // browser notification
      this.showBrowserNotification();
    }

    this.previousTicketCount = res.length;

    this.tickets = res;

    this.filteredTickets = res;

    this.calculateStats();
  });
}

showBrowserNotification() {

  if (Notification.permission === 'granted') {

    new Notification('New Ticket Received', {
      body: 'A new support ticket has been created.'
    });

  } else if (Notification.permission !== 'denied') {

    Notification.requestPermission();
  }
}

  calculateStats() {

  this.stats.total = this.tickets.length;

  this.stats.open = this.tickets.filter(t => t.status === 'Open').length;

  this.stats.inProgress = this.tickets.filter(t => t.status === 'InProgress').length;

  this.stats.closed = this.tickets.filter(t => t.status === 'Closed').length;

  this.stats.highPriority = this.tickets.filter(t => t.priority === 'High').length;

  // THIS WEEK COUNT
  const now = new Date();

  const oneWeekAgo = new Date();

  oneWeekAgo.setDate(now.getDate() - 7);

  this.stats.thisWeek = this.tickets.filter(t => {

    return new Date(t.createdDate) >= oneWeekAgo;

  }).length;
}

  applyFilters() {
    this.filteredTickets = this.tickets.filter(t => {
      return (!this.filters.status || t.status === this.filters.status)
        && (!this.filters.priority || t.priority === this.filters.priority)
        && (!this.filters.search || t.ticketNumber.includes(this.filters.search));
    });
  }

  clearFilters() {
    this.filters = {};
    this.filteredTickets = this.tickets;
  }

  updateStatus(ticketId: number, event: any) {
    const status = event.target.value;

    this.api.updateStatus(ticketId, status).subscribe(() => {
      this.loadAllTickets();
    });
  }

  openAssignModal(ticketId: number) {
    this.selectedTicketId = ticketId;
    this.showAssignModal = true;
  }

  assignTicket() {
    this.api.assignTicket(this.selectedTicketId, this.selectedUserId).subscribe(() => {
      this.showAssignModal = false;
      this.loadAllTickets();
    });
  }

  viewTicket(ticket: any) {
    this.selectedTicket = ticket;
    this.showTicketModal = true;
  }

  addComment() {

  if (!this.newComment?.trim()) {
    return;
  }

  const payload = {

    ticketId: this.selectedTicket.ticketId,

    comment: this.newComment,

    commentedBy:
      localStorage.getItem('username')
  };

  this.api.addComment(payload)
    .subscribe({

      next: () => {

        this.newComment = '';

        this.loadAllTickets();

        const updatedTicket =
          this.tickets.find(
            x => x.ticketId === this.selectedTicket.ticketId
          );

        if (updatedTicket) {

          this.selectedTicket = updatedTicket;
        }
      }
    });
}

  formatDate(date: any) {
    return new Date(date).toLocaleString();
  }

  getStatusClass(status: string) {
    return {
      'badge bg-danger': status === 'Open',
      'badge bg-warning': status === 'InProgress',
      'badge bg-success': status === 'Closed'
    };
  }

  getPriorityClass(priority: string) {
    return {
      'badge bg-danger': priority === 'High',
      'badge bg-warning': priority === 'Medium',
      'badge bg-secondary': priority === 'Low'
    };
  }
}