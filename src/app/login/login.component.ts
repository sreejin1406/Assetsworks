import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginserviceService } from '../loginservice.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  showPassword = false;
  loginForm!: FormGroup;

  isClicked = false;
  isLoading = false;
  activeTab: string = 'login';

  constructor(
    private fb: FormBuilder,
    private loginService: LoginserviceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // FORCE LOGOUT when opening login page
    localStorage.clear();

    this.loginForm = this.fb.group({
      userID: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // Button Ripple Animation
  animateButton(event: MouseEvent): void {
    if (this.loginForm.valid) {
      this.isClicked = true;

      const button = event.currentTarget as HTMLElement;
      const ripple = document.createElement('div');
      ripple.classList.add('btn-ripple');

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      ripple.style.pointerEvents = 'none';

      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
      setTimeout(() => this.isClicked = false, 400);
    }
  }

  // UPDATED LOGIN FUNCTION with Client Portal support
onLogin() {

  if (this.loginForm.invalid || this.isLoading) return;

  this.isClicked = true;
  this.isLoading = true;

  const payload = {
    userID: this.loginForm.value.userID,
    password: this.loginForm.value.password
  };

  this.loginService.login(payload).subscribe({

    next: (res: any) => {

      this.isLoading = false;

      console.log('Login Response:', res);

      const role = res.role?.trim().toLowerCase();

      if (!role || !res.userId) {

        alert('Invalid login response');
        return;
      }

      // ✅ Decode JWT Token

      const tokenPayload = JSON.parse(
        atob(res.token.split('.')[1])
      );

     console.log(tokenPayload);

// ✅ STORE USER DETAILS
localStorage.setItem('token', res.token);
localStorage.setItem(
  'userId',
  res.userId || ''
);

localStorage.setItem(
  'username',
  tokenPayload.UserName ||
  tokenPayload.username ||
  res.fullName ||
  ''
);

localStorage.setItem(
  'email',
  tokenPayload.Email ||
  tokenPayload.email ||
  ''
);

localStorage.setItem(
  'mobile',
  tokenPayload.Mobile ||
  tokenPayload.mobile ||
  ''
);

localStorage.setItem(
  'role',
  role || ''
);



localStorage.setItem(
  'location',
  tokenPayload.Location ||
  tokenPayload.location ||
  ''
);
      // ✅ Navigation

      if (
        role === 'admin' ||
        role === 'software developer'
      ) {

        this.router.navigate(['/dashboard']);

      }
      else if (role === 'head') {

        this.router.navigate(['/dashboard']);

      }
      else if (role === 'client') {
  this.router.navigate(['/dashboard']);
}
      else {

        this.router.navigate(['/login']);

      }
    },

    error: (err: any) => {

      this.isLoading = false;

      console.error('Login error:', err);

      alert('Invalid UserID or Password');
    }
  });
}

  // Tab Switch (if needed)
  switchTab(tab: string) {
    this.activeTab = tab;
  }

  // Show/Hide Password
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}