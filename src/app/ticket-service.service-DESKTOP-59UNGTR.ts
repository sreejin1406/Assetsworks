import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private baseUrl = 'https://localhost:7168/api';

  constructor(private http: HttpClient) {}

  // GET ALL TICKETS
  getAllTickets(): Observable<any> {

    return this.http.get(`${this.baseUrl}/ticket`);
  }

  // GET MY TICKETS
  getMyTickets(): Observable<any> {

    return this.http.get(`${this.baseUrl}/ticket/user`);
  }

  // CREATE TICKET
  createTicket(data: any): Observable<any> {

    return this.http.post(`${this.baseUrl}/ticket`, data);
  }

  // UPDATE STATUS
  updateStatus(id: number, status: string): Observable<any> {

    return this.http.put(
      `${this.baseUrl}/ticket/status?id=${id}&status=${status}`,
      {}
    );
  }


  // ASSIGN TICKET
  assignTicket(ticketId: number, userId: string): Observable<any> {

    return this.http.put(
      `${this.baseUrl}/ticket/assign?ticketId=${ticketId}&userId=${userId}`,
      {}
    );
  }

  // comment
  
addComment(data: any): Observable<any> {

  return this.http.post(
    `${this.baseUrl}/ticket/comment`,
    data
  );
}
  // GET USERS
getUsers(): Observable<any> {

  return this.http.get(`${this.baseUrl}/ticket/users`);
}
}