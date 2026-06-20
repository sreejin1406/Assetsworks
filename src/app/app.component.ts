import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TicketService } from './ticket-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'assetswork';
  showNavbar: boolean = true;
  role: string = '';

  newTicketCount = 0;
  previousTicketCount = 0;

  showNotifications = false;

  intervalId: any;

  // Audio
  audio = new Audio();

  constructor(
    private router: Router,
    private api: TicketService
  ) {}

  ngOnInit() {

    // Audio Path
    this.audio.src = 'assets_track/src/assets/notification.mp3';
    this.audio.load();

    // Browser Notification Permission
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // Navbar Logic
    this.router.events.subscribe(event => {

      if (event instanceof NavigationEnd) {

        this.role = (localStorage.getItem('role') || '').toLowerCase();

        console.log('LocalStorage Role:', localStorage.getItem('role'));
    console.log('Component Role:', this.role);
    
        this.showNavbar = !this.router.url.includes('/login');

        console.log('Role:', this.role);
      }
    });

    // Run Once
    this.checkNewTickets();

    // Auto Check Every 5 Seconds
    this.intervalId = setInterval(() => {
      this.checkNewTickets();
    }, 5000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
clearNotifications() {
  this.newTicketCount = 0;
}
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;

    // Reset Count When Opened
    if (this.showNotifications) {
      this.newTicketCount = 0;
    }
  }

  checkNewTickets() {

    this.api.getAllTickets().subscribe((tickets: any[]) => {

      // First Load
      if (this.previousTicketCount === 0) {
        this.previousTicketCount = tickets.length;
        return;
      }

      // New Ticket Added
      if (tickets.length > this.previousTicketCount) {

        this.newTicketCount++;

        // Play Sound
        this.audio.currentTime = 0;

        this.audio.play().catch(err => {
          console.log('Audio blocked:', err);
        });

        // Browser Notification
        this.showBrowserNotification();
      }

      this.previousTicketCount = tickets.length;
    });
  }

  showBrowserNotification() {

    if (Notification.permission === 'granted') {

      new Notification('New Ticket Received', {
        body: 'A new support ticket has been created.',
        icon: 'assets/logo.png'
      });
    }
  }
}