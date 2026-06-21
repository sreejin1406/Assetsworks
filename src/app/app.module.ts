import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AssetscreenComponent } from './assetscreen/assetscreen.component';

import { LoginComponent } from './login/login.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor.service';
 import { ClientPortalComponent } from './client-portal/client-portal.component';
import { AdminPortalComponent } from './admin-portal/admin-portal.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { CreateUserComponent } from './create-user/create-user.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    AssetscreenComponent,
AdminPortalComponent,
    LoginComponent,
  
      ClientPortalComponent,
         EmployeePortalComponent,
         CreateUserComponent,
      
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }