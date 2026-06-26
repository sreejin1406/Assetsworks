import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {

  private hubConnection!: signalR.HubConnection;

  ticketCreated = new Subject<any>();

  statusUpdated = new Subject<any>();

  ticketAssigned = new Subject<any>();

  commentAdded = new Subject<any>();


  startConnection(): void {

    this.hubConnection = new signalR.HubConnectionBuilder()

      .withUrl('https://localhost:7168/ticketHub')

      .withAutomaticReconnect()

      .build();

    this.hubConnection

      .start()

      .then(() => console.log('SignalR Connected'))

      .catch(err => console.error(err));



    this.registerEvents();

  }


  private registerEvents(): void {

    this.hubConnection.on(

      'TicketCreated',

      data => this.ticketCreated.next(data)

    );


    this.hubConnection.on(

      'StatusUpdated',

      data => this.statusUpdated.next(data)

    );


    this.hubConnection.on(

      'TicketAssigned',

      data => this.ticketAssigned.next(data)

    );


    this.hubConnection.on(

      'CommentAdded',

      data => this.commentAdded.next(data)

    );

  }

}