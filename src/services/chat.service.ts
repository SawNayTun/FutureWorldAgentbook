import { Injectable, signal, effect } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, Database, off, serverTimestamp, set, get, remove, update } from 'firebase/database';

export interface ChatMessage {
  id?: string;
  text?: string; // Content payload (text or base64 image)
  imageUrl?: string; // For backward compatibility or distinct field
  type?: 'text' | 'image';
  senderId: string;
  timestamp: number;
}

export interface ChatContact {
  userId: string;
  name: string;
  lastMessage?: string;
  lastTimestamp?: number;
  chatId: string;
}

export interface FriendRequest {
  senderId: string;
  senderName: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private app: FirebaseApp | undefined;
  private db: Database | undefined;
  
  // Signals
  contacts = signal<ChatContact[]>([]);
  incomingRequests = signal<FriendRequest[]>([]); 
  activeMessages = signal<ChatMessage[]>([]);
  isConnected = signal(false);

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyAas8VrbH-tb6FWQRa4JrqEJEZcsOKcwEo",
      authDomain: "d-management-6bd74.firebaseapp.com",
      databaseURL: "https://d-management-6bd74-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "d-management-6bd74",
      storageBucket: "d-management-6bd74.firebasestorage.app",
      messagingSenderId: "881446635711",
      appId: "1:881446635711:web:cf755a10a36adfbd339e0a",
      measurementId: "G-GVF6DEGVJX"
    };

    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getDatabase(this.app);
      
      // Monitor connection status properly
      const connectedRef = ref(this.db, '.info/connected');
      onValue(connectedRef, (snap) => {
        this.isConnected.set(!!snap.val());
      });

    } catch (error) {
      console.error('Firebase Init Error:', error);
      this.isConnected.set(false);
    }
  }

  // --- 1. Listeners ---

  private contactsListener: any = null;
  private requestsListener: any = null;

  listenToUserData(myUserId: string) {
    if (!this.db || !myUserId) return;

    const contactsPath = `users/${myUserId}/contacts`;
    const requestsPath = `requests/${myUserId}`;

    // Clean up existing listeners
    off(ref(this.db, contactsPath));
    off(ref(this.db, requestsPath));

    // Listen to Contacts
    onValue(ref(this.db, contactsPath), (snapshot) => {
      const data = snapshot.val();
      console.log('Contacts updated from Firebase:', data);
      if (data) {
        const list: ChatContact[] = Object.values(data);
        list.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
        this.contacts.set(list);
      } else {
        this.contacts.set([]);
      }
    });

    // Listen to Incoming Requests
    onValue(ref(this.db, requestsPath), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FriendRequest[] = Object.values(data);
        list.sort((a, b) => b.timestamp - a.timestamp);
        this.incomingRequests.set(list);
      } else {
        this.incomingRequests.set([]);
      }
    });
  }

  // --- 2. Friend Request Logic ---

  async sendFriendRequest(myId: string, myName: string, targetId: string) {
    if (!this.db) return;
    
    if (myId === targetId) throw new Error("Cannot add yourself.");

    // Write to target's request bucket
    const requestRef = ref(this.db, `requests/${targetId}/${myId}`);
    
    await set(requestRef, {
      senderId: myId,
      senderName: myName,
      timestamp: Date.now()
    });
  }

  async acceptFriendRequest(myId: string, myName: string, request: FriendRequest) {
    if (!this.db) return;

    const otherId = request.senderId;
    const otherName = request.senderName;
    const chatId = [myId, otherId].sort().join('_'); // Consistent Chat ID

    const updates: any = {};

    // 1. Add to My Contacts
    updates[`users/${myId}/contacts/${otherId}`] = {
      userId: otherId,
      name: otherName,
      chatId: chatId,
      lastTimestamp: Date.now()
    };

    // 2. Add to Other's Contacts
    updates[`users/${otherId}/contacts/${myId}`] = {
      userId: myId,
      name: myName,
      chatId: chatId,
      lastTimestamp: Date.now()
    };

    // 3. Delete the Request
    updates[`requests/${myId}/${otherId}`] = null;

    // Perform atomic update
    await update(ref(this.db), updates);
  }

  async rejectFriendRequest(myId: string, senderId: string) {
    if (!this.db) return;
    await remove(ref(this.db, `requests/${myId}/${senderId}`));
  }

  async removeContact(myId: string, otherId: string) {
    if (!this.db) return;
    
    console.log(`Removing contact: ${myId} -> ${otherId}`);

    // 1. Remove from local side
    try {
      const myContactRef = ref(this.db, `users/${myId}/contacts/${otherId}`);
      await remove(myContactRef);
      console.log('Removed from local contacts');
    } catch (error) {
      console.error('Failed to remove local contact:', error);
      throw error;
    }
    
    // 2. Remove from other side
    try {
      const otherContactRef = ref(this.db, `users/${otherId}/contacts/${myId}`);
      await remove(otherContactRef);
      console.log('Removed from remote contacts');
    } catch (e) {
      console.warn('Could not remove remote contact (ignored):', e);
    }
  }

  // --- 3. Messaging ---

  listenToMessages(chatId: string) {
    if (!this.db || !chatId) return;
    this.activeMessages.set([]); 

    const messagesRef = ref(this.db, `messages/${chatId}`);
    
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList: ChatMessage[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        this.activeMessages.set(msgList);
      } else {
        this.activeMessages.set([]);
      }
    });
  }

  stopListeningMessages(chatId: string) {
    if (!this.db || !chatId) return;
    off(ref(this.db, `messages/${chatId}`));
  }

  async sendMessage(chatId: string, content: string, senderId: string, myId: string, otherId: string, type: 'text' | 'image' = 'text') {
    if (!this.db) return;
    
    const messageData: any = {
      senderId,
      timestamp: serverTimestamp(),
      type
    };

    if (type === 'image') {
      messageData.imageUrl = content;
      messageData.text = 'Sent an image'; // Fallback text for notifications
    } else {
      messageData.text = content;
    }

    // 1. Push Message
    await push(ref(this.db, `messages/${chatId}`), messageData);

    // 2. Update Last Message for both users
    const db = this.db;
    const lastMsgPreview = type === 'image' ? 'Sent an image' : content;

    const updates: any = {};
    updates[`users/${myId}/contacts/${otherId}/lastMessage`] = lastMsgPreview;
    updates[`users/${myId}/contacts/${otherId}/lastTimestamp`] = serverTimestamp();
    updates[`users/${otherId}/contacts/${myId}/lastMessage`] = lastMsgPreview;
    updates[`users/${otherId}/contacts/${myId}/lastTimestamp`] = serverTimestamp();
    
    await update(ref(db), updates);
  }

  async deleteMessage(chatId: string, messageId: string) {
    if (!this.db || !chatId || !messageId) return;
    await remove(ref(this.db, `messages/${chatId}/${messageId}`));
  }

  // --- 4. Calling Signaling ---

  async sendCallSignal(targetId: string, callerId: string, callerName: string, type: 'audio' | 'video') {
    if (!this.db) return;
    const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
    await set(callRef, {
      callerId,
      callerName,
      type,
      status: 'ringing',
      timestamp: serverTimestamp()
    });
  }

  async updateCallStatus(targetId: string, callerId: string, status: 'accepted' | 'rejected' | 'ended') {
    if (!this.db) return;
    const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
    if (status === 'ended' || status === 'rejected') {
      await remove(callRef);
    } else {
      await update(callRef, { status });
    }
  }

  async sendWebRTCSignal(targetId: string, callerId: string, type: 'offer' | 'answer' | 'candidate', data: any) {
    if (!this.db) return;
    // Path is always calls/targetId/callerId
    // If I am caller, targetId is the other person.
    // If I am callee, targetId is ME, callerId is the other person.
    // WAIT: The path must be consistent.
    // The call is established at `calls/{calleeId}/{callerId}`.
    
    // So we need to know who is the original "callee" (target) and "caller".
    // I will pass the path components explicitly.
    const callPath = `calls/${targetId}/${callerId}`;
    
    if (type === 'candidate') {
        await push(ref(this.db, `${callPath}/candidates`), data);
    } else {
        await update(ref(this.db, callPath), { [type]: data });
    }
  }

  listenToCalls(myId: string, callback: (call: any) => void) {
    if (!this.db || !myId) return;
    const callsRef = ref(this.db, `calls/${myId}`);
    onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get the most recent call
        const calls = Object.values(data);
        if (calls.length > 0) {
          callback(calls[0]);
        }
      } else {
        callback(null);
      }
    });
  }

  listenToCallSignal(targetId: string, callerId: string, callback: (data: any) => void) {
      if (!this.db) return;
      const callRef = ref(this.db, `calls/${targetId}/${callerId}`);
      onValue(callRef, (snapshot) => {
          callback(snapshot.val());
      });
  }
}