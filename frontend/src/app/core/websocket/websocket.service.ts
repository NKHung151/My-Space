import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

// Removed PendingSubscription interface

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private authService = inject(AuthService);

  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  // Active STOMP subscriptions
  private subscriptions: Map<string, StompSubscription> = new Map();
  // Callbacks per topic
  private topicCallbacks: Map<string, Set<(message: any) => void>> = new Map();

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
        Authorization: `Bearer ${savedToken}`,
      },
      debug: (str) => {
        console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.connectionStateSubject.next(true);
      console.log('[WS] Connected to WebSocket server');
      // Re-subscribe all pending topics after (re-)connect
      this.topicCallbacks.forEach((callbacks, topic) => {
        console.log('[WS] Re-subscribing to topic:', topic);
        this.doSubscribe(topic);
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
    this.topicCallbacks.clear();
  }

  public subscribeToTopic(
    topic: string,
    callback: (message: any) => void,
  ): { unsubscribe: () => void } {
    if (!this.topicCallbacks.has(topic)) {
      this.topicCallbacks.set(topic, new Set());
    }
    this.topicCallbacks.get(topic)!.add(callback);

    console.log(
      '[WS] Added callback for topic:',
      topic,
      '| Connected:',
      this.client?.connected,
    );

    // If already connected and not yet subscribed to STOMP, subscribe now
    if (this.client && this.client.connected && !this.subscriptions.has(topic)) {
      this.doSubscribe(topic);
    }
    
    return {
      unsubscribe: () => {
        const callbacks = this.topicCallbacks.get(topic);
        if (callbacks) {
          callbacks.delete(callback);
          // If no one is listening anymore, unsubscribe from STOMP
          if (callbacks.size === 0) {
            this.unsubscribeFromTopic(topic);
          }
        }
      }
    };
  }

  private doSubscribe(topic: string): void {
    // Don't double-subscribe
    if (this.subscriptions.has(topic)) {
      return;
    }

    if (!this.client || !this.client.connected) return;

    console.log('[WS] Subscribing to topic:', topic);
    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      console.log(
        '[WS] Received message on topic:',
        topic,
        '| Body:',
        message.body,
      );
      try {
        const parsed = message.body ? JSON.parse(message.body) : null;
        const callbacks = this.topicCallbacks.get(topic);
        if (callbacks) {
          callbacks.forEach((cb) => cb(parsed));
        }
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
    this.topicCallbacks.delete(topic);
    console.log('[WS] Unsubscribed from topic:', topic);
  }

  public sendMessage(destination: string, payload: any): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: destination,
        body: JSON.stringify(payload),
      });
    } else {
      console.warn('[WS] Cannot send message, client not connected');
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
