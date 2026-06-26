// services/ticket.service.ts

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private baseUrl = 'https://localhost:7168/api';

  constructor(private http: HttpClient) {}

  private getHeaders() {

  const token = localStorage.getItem('token');

  return {
    headers: new HttpHeaders({
      Authorization: `Bearer ${token}`
    })
  };
}

getUsers(): Observable<any> {

  return this.http.get(
    `${this.baseUrl}/ticket/users`,
    this.getHeaders()
  );
}

  // ✅ Get all tickets
  getAllTickets(): Observable<any> {
   return this.http.get(
  `${this.baseUrl}/ticket`,
  this.getHeaders()
);}

  // ✅ Get my tickets (client)
 getMyTickets(): Observable<any> {
  return this.http.get(
  `${this.baseUrl}/ticket/user`,
  this.getHeaders()
);
}

  // ✅ Create ticket
  createTicket(data: any): Observable<any> {
    return this.http.post(
  `${this.baseUrl}/ticket`,
  data,
  this.getHeaders()
);
  }

  // ✅ Update status
  updateStatus(id: number, status: string): Observable<any> {
return this.http.put(
  `${this.baseUrl}/ticket/status?id=${id}&status=${status}`,
  {},
  this.getHeaders()
);  }

  // ✅ Assign ticket (if you create backend)
 assignTicket(ticketId: number, userId: string): Observable<any> {

  return this.http.put(
    `${this.baseUrl}/ticket/assign?ticketId=${ticketId}&userId=${userId}`,
    {},
    this.getHeaders()
  );
}

getAssignedTickets(): Observable<any> {
  return this.http.get(
    `${this.baseUrl}/ticket/assigned`,
    this.getHeaders()
  );
}

addComment(data: any): Observable<any> {

  return this.http.post(
    `${this.baseUrl}/ticket/comment`,
    data,
    this.getHeaders()
  );
}



getComments(ticketId: number): Observable<any[]> {

  return this.http.get<any[]>(
    `${this.baseUrl}/ticket/comments/${ticketId}`,
    this.getHeaders()
  );
}
}