import { Component, OnInit } from '@angular/core';
import { TicketService } from '../ticket-service.service';

@Component({
  selector: 'app-employee-portal',
  templateUrl: './employee-portal.component.html',
  styleUrls: ['./employee-portal.component.css']
})
export class EmployeePortalComponent implements OnInit {

  tickets:any[]=[];
  filteredTickets:any[]=[];

  selectedTicket:any;

  showTicketModal=false;

  newComment='';

  stats = {
  total: 0,
  open: 0,
  inProgress: 0,
  closed: 0
};

  constructor(
    private api:TicketService
  ) {}

 ngOnInit(): void {
  this.loadTickets();
}

loadTickets() {

  this.api.getAssignedTickets()
    .subscribe((res:any)=>{

      this.tickets = res;

      this.filteredTickets = res;

      this.calculateStats();
    });
}

calculateStats() {

  this.stats.total = this.tickets.length;

  this.stats.open =
    this.tickets.filter(t => t.status === 'Open').length;

  this.stats.inProgress =
    this.tickets.filter(t => t.status === 'InProgress').length;

  this.stats.closed =
    this.tickets.filter(t => t.status === 'Closed').length;
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

        this.loadTickets();

        const updatedTicket =
          this.tickets.find(
            x => x.ticketId === this.selectedTicket.ticketId
          );

        if (updatedTicket) {

          this.selectedTicket = updatedTicket;
        }
      },

      error: (err) => {

        console.log(err);

        alert('Failed to add comment');
      }
    });
}

  viewTicket(ticket:any) {

    this.selectedTicket=ticket;

    this.showTicketModal=true;
  }

  updateStatus(ticketId:number,event:any) {

    const status=event.target.value;

    this.api.updateStatus(
      ticketId,
      status
    ).subscribe(()=>{

      this.loadTickets();
    });
  }

  formatDate(date:any) {

    return new Date(date)
      .toLocaleString();
  }

  getStatusClass(status:string) {

    return {

      'badge bg-danger':status==='Open',

      'badge bg-warning':status==='InProgress',

      'badge bg-success':status==='Closed'
    };
  }

  getPriorityClass(priority:string) {

    return {

      'badge bg-danger':priority==='High',

      'badge bg-warning':priority==='Medium',

      'badge bg-secondary':priority==='Low'
    };
  }
}