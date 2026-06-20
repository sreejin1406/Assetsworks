import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
  console.log('AuthGuard triggered');

  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  if (!role || !userId) {
    console.log('Blocked - no login');
    localStorage.clear();
    this.router.navigate(['/login']);
    return false;
  }

  const normalizedRole = role.trim().toLowerCase();

  // ✅ SUPER ACCESS (Software Developer can access ALL)
  if (normalizedRole === 'software developer') {
    console.log('Super Access Granted (Software Developer)');
    return true;
  }

  const allowedRoles = route.data['roles'] as Array<string>;

  const isAllowed = allowedRoles.some(
    r => r.toLowerCase() === normalizedRole
  );

  if (isAllowed) {
    console.log('Access granted:', normalizedRole);
    return true;
  }

  console.log('Blocked:', normalizedRole);

  this.router.navigate(['/login']);
  return false;
}}