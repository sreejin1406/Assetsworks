import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CreateserviceService } from '../createservice.service';

export type CreateTab = 'user' | 'client';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.css']
})
export class CreateUserComponent implements OnInit {

  // ---------- tabs ----------
  activeTab: CreateTab = 'user';

  roleOptions: string[] = ['Admin', 'Software Developer', 'Head'];

  // ---------- forms ----------
  userForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    role: ['', Validators.required],
    location: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordsMatch });

  clientForm: FormGroup = this.fb.group({
    clientName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    location: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordsMatch });

  // ---------- ui state ----------
  submitting = false;
  successMessage = '';
  errorMessage = '';
  showUserPassword = false;
  showClientPassword = false;

  constructor(
  private fb: FormBuilder,
  private createService: CreateserviceService
) { }

  ngOnInit(): void { }

  // =====================================================
  // Cross-field validator
  // =====================================================

private passwordsMatch(control: AbstractControl): ValidationErrors | null {

  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  return password.value === confirmPassword.value
    ? null
    : { passwordMismatch: true };
}

  // =====================================================
  // Tabs
  // =====================================================

  switchTab(tab: CreateTab): void {
    if (this.activeTab === tab) { return; }
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
  }

  // =====================================================
  // Password helpers
  // =====================================================

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  generateUserPassword(): void {
    const pwd = this.generatePassword();
    this.userForm.patchValue({ password: pwd, confirmPassword: pwd });
    this.showUserPassword = true;
  }

  generateClientPassword(): void {
    const pwd = this.generatePassword();
    this.clientForm.patchValue({ password: pwd, confirmPassword: pwd });
    this.showClientPassword = true;
  }

  // =====================================================
  // Submit — New User (internal staff)
  // =====================================================

 onSubmitUser(): void {

  if (this.userForm.invalid) {
    this.userForm.markAllAsTouched();
    return;
  }

  this.submitting = true;
  this.clearMessages();

  const { confirmPassword, ...rest } = this.userForm.value;

  const payload = {
    username: rest.username,
    usermail: rest.email,
    usermobile: rest.mobile,
    location: rest.location,
    role: rest.role,
    password: rest.password
  };

  this.createService.createUser(payload).subscribe({
   next: (res:any)=>{

 if(res.success){

    this.successMessage = res.message;

 }else{

    this.errorMessage = res.message;
 }
      this.submitting = false;

      this.userForm.reset({
        username: '',
        email: '',
        mobile: '',
        role: '',
        location: '',
        password: '',
        confirmPassword: ''
      });

      this.showUserPassword = false;
    },

    error: (err: any) => {
      console.error('Failed to create user', err);

      this.errorMessage =
        err?.error || 'Could not create the user. Please try again.';

      this.submitting = false;
    }
  });
}

  // =====================================================
  // Submit — New Client
  // =====================================================

  onSubmitClient(): void {

  if (this.clientForm.invalid) {
    this.clientForm.markAllAsTouched();
    return;
  }

  this.submitting = true;
  this.clearMessages();

  const { clientName, confirmPassword, ...rest } = this.clientForm.value;

  const payload = {
    username: clientName,
    clientName: clientName,
    usermail: rest.email,
    usermobile: rest.mobile,
    location: rest.location,
    password: rest.password
  };

  this.createService.createClient(payload).subscribe({
    next: (res:any)=>{

 if(res.success){

    this.successMessage = res.message;

 }else{

    this.errorMessage = res.message;
 }
      this.submitting = false;

      this.clientForm.reset({
        clientName: '',
        email: '',
        mobile: '',
        location: '',
        password: '',
        confirmPassword: ''
      });

      this.showClientPassword = false;
    },
    error: (err) => {
      console.error(err);
      this.errorMessage = 'Could not create the client.';
      this.submitting = false;
    }
  });
}

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

 showResetModal = true;

resetPasswordForm: FormGroup = this.fb.group({
  userId: ['', Validators.required],
  newPassword: ['', [Validators.required, Validators.minLength(6)]]
});

selectedUserId = '';

newPassword = '';

openResetPassword(userId: string): void {

  this.resetPasswordForm.patchValue({
    userId: userId,
    newPassword: ''
  });

  this.showResetModal = true;
}

closeResetModal(): void {
  this.showResetModal = false;
}

savePassword(): void {

  if (this.resetPasswordForm.invalid) {
    this.resetPasswordForm.markAllAsTouched();
    return;
  }

  this.createService
    .resetPassword(this.resetPasswordForm.value)
    .subscribe({
      next: (res: any) => {

        this.successMessage = res.message;

        this.showResetModal = false;

        this.resetPasswordForm.reset();
      },
      error: (err) => {

        this.errorMessage =
          err?.error || 'Failed to reset password';
      }
    });
}

  // =====================================================
  // 3D tilt + mouse-follow sheen (form card)
  // =====================================================

  onTiltMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    target.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
    target.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    target.style.setProperty('--sheen-angle', `${90 + px * 70}deg`);
  }

  onTiltLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.setProperty('--rx', `0deg`);
    target.style.setProperty('--ry', `0deg`);
  }
}
