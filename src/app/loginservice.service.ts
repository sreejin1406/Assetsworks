import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoginserviceService {

  private apiUrl = 'https://localhost:7168/api/Login';

  constructor(private http: HttpClient) { }

  login(data: any) {
    return this.http.post(this.apiUrl, data);
  }
}