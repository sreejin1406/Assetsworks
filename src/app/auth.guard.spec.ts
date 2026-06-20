import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('AuthGuard triggered for path:', route.routeConfig?.path);

    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    // STRICT CHECK - No login
    if (!role || !userId) {
      console.log('Blocked - no login credentials');
      localStorage.clear();
      this.router.navigate(['/login']);
      return false;
    }

    // Get allowed roles from route data
    const allowedRoles = route.data['roles'] as Array<string>;
    
    if (!allowedRoles || allowedRoles.length === 0) {
      console.log('No roles specified, allowing access');
      return true;
    }
    
    // Normalize role for comparison
    const normalizedRole = role.trim().toLowerCase();
    
    // Check if user's role is allowed
    const isAllowed = allowedRoles.some(allowedRole => 
      allowedRole.toLowerCase() === normalizedRole
    );

    if (isAllowed) {
      console.log('Access granted for role:', normalizedRole);
      return true;
    }

    console.log('Blocked - role mismatch. Required:', allowedRoles, 'Got:', normalizedRole);
    
    // Redirect based on role
    if (normalizedRole === 'client') {
      this.router.navigate(['/client-portal']);
    } else if (normalizedRole === 'admin' || normalizedRole === 'software developer') {
      this.router.navigate(['/admin-portal']);
    } else {
      this.router.navigate(['/login']);
      localStorage.clear();
    }
    
    return false;
  }
}