import { Component, OnInit } from '@angular/core';
import { TicketService } from '../ticket-service.service';

@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.component.html',
  styleUrls: ['./admin-portal.component.css']
})
export class AdminPortalComponent implements OnInit {

  // =========================
  // TICKETS
  // =========================

  tickets: any[] = [];

  filteredTickets: any[] = [];

  // =========================
  // STATS
  // =========================

  stats: any = {
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    highPriority: 0,
    thisWeek: 0,
    avgResolution: 24
  };

  // =========================
  // FILTERS
  // =========================

  filters: any = {
    status: '',
    priority: '',
    assignedTo: '',
    search: ''
  };

  // =========================
  // ASSIGN MODAL
  // =========================

  showAssignModal = false;

  selectedTicketId!: number;

  // ✅ FIXED
  // because UserId = EMP1 / EMP2
  selectedUserId: string = '';

  // =========================
  // USERS
  // =========================

  users: any[] = [

    {
      userId: 'EMP1',
      username: 'Ajesh'
    },

    {
      userId: 'EMP2',
      username: 'John'
    },

    {
      userId: 'EMP3',
      username: 'David'
    }
  ];

  // =========================
  // VIEW TICKET
  // =========================

  selectedTicket: any;

  showTicketModal = false;

  newComment = '';

  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(private api: TicketService) {}

  // =========================
  // INIT
  // =========================

  ngOnInit(): void {

    this.loadAllTickets();
    this.loadUsers();
  }

  // =========================
  // LOAD ALL TICKETS
  // =========================

  loadAllTickets() {

    this.api.getAllTickets().subscribe({

      next: (res: any) => {

        this.tickets = res;

        this.filteredTickets = res;

        this.calculateStats();
      },

      error: (err: any) => {

        console.error(err);

        alert('Failed to load tickets');
      }
    });
  }

  // =========================
  // CALCULATE STATS
  // =========================

  calculateStats() {

    this.stats.total =
      this.tickets.length;

    this.stats.open =
      this.tickets.filter(
        t => t.status === 'Open'
      ).length;

    this.stats.inProgress =
      this.tickets.filter(
        t => t.status === 'InProgress'
      ).length;

    this.stats.closed =
      this.tickets.filter(
        t => t.status === 'Closed'
      ).length;

    this.stats.highPriority =
      this.tickets.filter(
        t => t.priority === 'High'
      ).length;
  }

  // =========================
  // APPLY FILTERS
  // =========================

  applyFilters() {

    this.filteredTickets = this.tickets.filter(t => {

      return (

        (!this.filters.status ||
          t.status === this.filters.status)

        &&

        (!this.filters.priority ||
          t.priority === this.filters.priority)

        &&

        (!this.filters.assignedTo ||
          t.assignedTo === this.filters.assignedTo)

        &&

        (
          !this.filters.search ||

          t.ticketNumber
            ?.toLowerCase()
            .includes(this.filters.search.toLowerCase())
        )
      );
    });
  }

  // =========================
  // CLEAR FILTERS
  // =========================

  clearFilters() {

    this.filters = {
      status: '',
      priority: '',
      assignedTo: '',
      search: ''
    };

    this.filteredTickets = this.tickets;
  }

  // =========================
  // UPDATE STATUS
  // =========================

  updateStatus(ticketId: number, event: any) {

    const status = event.target.value;

    this.api.updateStatus(ticketId, status).subscribe({

      next: () => {

        this.loadAllTickets();
      },

      error: (err: any) => {

        console.error(err);

        alert('Failed to update status');
      }
    });
  }

  // =========================
  // OPEN ASSIGN MODAL
  // =========================

  openAssignModal(ticketId: number) {

    this.selectedTicketId = ticketId;

    this.selectedUserId = '';

    this.showAssignModal = true;
  }

  // =========================
  // ASSIGN TICKET
  // =========================

  assignTicket() {

    if (!this.selectedUserId) {

      alert('Please select user');

      return;
    }

    this.api.assignTicket(
      this.selectedTicketId,
      this.selectedUserId
    ).subscribe({

      next: () => {

        alert('Ticket Assigned Successfully');

        this.showAssignModal = false;

        this.loadAllTickets();
      },

      error: (err: any) => {

        console.error(err);

        alert('Failed to assign ticket');
      }
    });
  }

  // =========================
  // VIEW TICKET
  // =========================

  viewTicket(ticket: any) {

    this.selectedTicket = ticket;

    this.showTicketModal = true;
  }

   // =========================
  // Assign user
  // =========================

  loadUsers() {

  this.api.getUsers().subscribe({

    next: (res: any) => {

      this.users = res;
    },

    error: (err: any) => {

      console.error(err);

      alert('Failed to load users');
    }
  });
}

  // =========================
  // ADD COMMENT
  // =========================

  addComment() {

  if (!this.newComment) return;

  const data = {

    ticketId: this.selectedTicket.ticketId,

    comment: this.newComment,

    
  commentedBy: localStorage.getItem('username')
  };

  this.api.addComment(data).subscribe({

    next: () => {

  alert('Comment Added');

  this.newComment = '';

  this.loadAllTickets();

  this.viewTicket(this.selectedTicket);
},

    error: (err: any) => {

      console.error(err);

      alert('Failed to add comment');
    }
  });
}

  // =========================
  // FORMAT DATE
  // =========================

  formatDate(date: any) {

    return new Date(date).toLocaleString();
  }

  // =========================
  // STATUS BADGE
  // =========================

  getStatusClass(status: string) {

    return {

      'badge bg-danger':
        status === 'Open',

      'badge bg-warning':
        status === 'InProgress',

      'badge bg-success':
        status === 'Closed'
    };
  }

  // =========================
  // PRIORITY BADGE
  // =========================

  getPriorityClass(priority: string) {

    return {

      'badge bg-danger':
        priority === 'High',

      'badge bg-warning':
        priority === 'Medium',

      'badge bg-secondary':
        priority === 'Low'
    };
  }
}