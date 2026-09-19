import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private authService = inject(AuthService);
  
  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();
  
  // Store subscriptions to easily clean them up
  private subscriptions: Map<string, StompSubscription> = new Map();
  
  constructor() {
    // Automatically connect when user logs in and disconnect when logged out
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect() {
    if (this.client && this.client.active) return;
    
    const token = this.authService.getToken(); 
    const savedToken = token || localStorage.getItem('access_token');
    
    if (!savedToken) return;

    // SockJS URL (thường endpoint ở backend Spring Boot là /ws)
    const socketUrl = `${environment.apiUrl.replace('/api', '')}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: `Bearer ${savedToken}`
      },
      debug: (str) => {
        if (!environment.production) {
          // console.log(str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.client.onConnect = (frame) => {
      this.connectionStateSubject.next(true);
      if (!environment.production) {
        console.log('Connected to WebSocket');
      }
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.onWebSocketClose = () => {
      this.connectionStateSubject.next(false);
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client && this.client.active) {
      this.client.deactivate();
    }
    this.connectionStateSubject.next(false);
    this.subscriptions.clear();
  }

  public subscribeToTopic(topic: string, callback: (message: any) => void): StompSubscription | null {
    if (!this.client || !this.client.connected) {
      console.warn('Cannot subscribe, STOMP client is not connected');
      return null;
    }
    
    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      if (message.body) {
        callback(JSON.parse(message.body));
      } else {
        callback(null);
      }
    });
    
    this.subscriptions.set(topic, subscription);
    return subscription;
  }
  
  public unsubscribeFromTopic(topic: string) {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
