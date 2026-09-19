import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

interface PendingSubscription {
  topic: string;
  callback: (message: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private authService = inject(AuthService);

  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  // Active STOMP subscriptions
  private subscriptions: Map<string, StompSubscription> = new Map();
  // Pending subscriptions waiting for connection
  private pendingSubscriptions: Map<string, PendingSubscription> = new Map();

  constructor() {
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

    const socketUrl = `${environment.apiUrl.replace('/api', '')}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: `Bearer ${savedToken}`
      },
      debug: (str) => {
        console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.client.onConnect = () => {
      this.connectionStateSubject.next(true);
      console.log('[WS] Connected to WebSocket server');
      // Re-subscribe all pending subscriptions after (re-)connect
      this.pendingSubscriptions.forEach((pending) => {
        console.log('[WS] Re-subscribing to pending topic:', pending.topic);
        this.doSubscribe(pending.topic, pending.callback);
      });
    };

    this.client.onStompError = (frame) => {
      console.error('[WS] Broker error: ' + frame.headers['message']);
    };

    this.client.onWebSocketClose = () => {
      this.connectionStateSubject.next(false);
      // Clear active subscriptions so they get re-created on reconnect
      this.subscriptions.clear();
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client && this.client.active) {
      this.client.deactivate();
    }
    this.connectionStateSubject.next(false);
    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
  }

  /**
   * Subscribe to a topic. If the client is not yet connected, the subscription
   * is queued and will be automatically activated once connected.
   */
  public subscribeToTopic(topic: string, callback: (message: any) => void): void {
    // Always store as pending so it survives reconnects
    this.pendingSubscriptions.set(topic, { topic, callback });
    console.log('[WS] Queued subscription for topic:', topic, '| Connected:', this.client?.connected);

    // If already connected, subscribe immediately
    if (this.client && this.client.connected) {
      this.doSubscribe(topic, callback);
    }
    // Otherwise it will be picked up in onConnect
  }

  private doSubscribe(topic: string, callback: (message: any) => void): void {
    // Don't double-subscribe
    if (this.subscriptions.has(topic)) {
      console.log('[WS] Already subscribed to topic:', topic);
      return;
    }

    if (!this.client || !this.client.connected) return;

    console.log('[WS] Subscribing to topic:', topic);
    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      console.log('[WS] Received message on topic:', topic, '| Body:', message.body);
      try {
        const parsed = message.body ? JSON.parse(message.body) : null;
        callback(parsed);
      } catch (e) {
        console.error('[WS] Failed to parse message on topic', topic, e);
      }
    });

    this.subscriptions.set(topic, subscription);
    console.log('[WS] Successfully subscribed to:', topic);
  }

  public unsubscribeFromTopic(topic: string) {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
    }
    this.pendingSubscriptions.delete(topic);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
