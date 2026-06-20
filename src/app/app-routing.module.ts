import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AssetscreenComponent } from './assetscreen/assetscreen.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';
import { ClientPortalComponent } from './client-portal/client-portal.component';
import { AdminPortalComponent } from './admin-portal/admin-portal.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['Head', 'Admin', 'Software Developer', 'client'] }
  },
  {
    path: 'client-portal',  // ✅ New Client Portal route
    component: ClientPortalComponent,
    canActivate: [AuthGuard],
    data: { roles: ['Software Developer', 'client', 'Admin',] }
  },
  {
    path: 'admin-portal',   // ✅ New Admin Portal route
    component: AdminPortalComponent,
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'Software Developer'] }
  },
  {
    path: 'assets',
    component: AssetscreenComponent,
    canActivate: [AuthGuard],
    data: { roles: ['Admin', 'Software Developer'] }
  },
  {
  path:'employee-portal',

  component:EmployeePortalComponent,

  canActivate:[AuthGuard],

  data:{
    roles:[
      'Technician',
      'Support Engineer',
      'Tech Support',
      'Software Developer'
    ]
  }
},
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }