import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CreateserviceService {

  private apiUrl = 'https://localhost:7168/api/Users';

  constructor(private http: HttpClient) { }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/CreateUser`, data);
  }

  createClient(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/CreateClient`, data);
  }

  resetPassword(data: any) {
  return this.http.post(
    `${this.apiUrl}/ResetPassword`,
    data
  );
}
}