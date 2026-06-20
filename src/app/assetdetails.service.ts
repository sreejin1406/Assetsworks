import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetdetailsService {

  private baseUrl = 'https://localhost:7168/api/Assets';

  constructor(private http: HttpClient) { }

  // 🔹 Get All Assets
  getAllAssets(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetAll`);
  }

  // 🔹 Get Models
  getModels(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetModels`);
  }

  // 🔹 Get Clients
  getClients(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetClients`);
  }

  // 🔹 Get Status
  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetStatus`);
  }

  // 🔹 Get Serial Numbers
  getSerialNumbers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/GetSerialNumbers`);
  }

 // get Specifications
  getspecifications():Observable<any>{
    return this.http.get(`${this.baseUrl}/GetSpecifications`)
  }

  // 🔹 Save Asset
  saveAsset(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/SaveAsset`, data);
  }

  // 🔹 Save Replacement Asset
  saveReplacement(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/SaveReplacement`, data);
  }

  getReplacements(): Observable<any> {
  return this.http.get(`${this.baseUrl}/GetReplacements`);
}

 //  status update
  updateStatusOnly(data: any) {
  return this.http.put(`${this.baseUrl}/UpdateStatusOnly`, data);
}

}