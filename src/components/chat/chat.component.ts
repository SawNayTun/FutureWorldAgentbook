import { Component, ChangeDetectionStrategy, input, output, inject, signal, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService, ChatContact, FriendRequest } from '../../services/chat.service';
import { XCircleIconComponent } from '../icons/x-circle-icon.component';
import { UploadIconComponent } from '../icons/upload-icon.component';
import { UserData } from '../../services/data.service';
import { PlusIconComponent } from '../icons/plus-icon.component';
import { BellIconComponent } from '../icons/bell-icon.component';
import { CheckIconComponent } from '../icons/check-icon.component';
import { MessageCircleIconComponent } from '../icons/message-circle-icon.component';
import { ImageIconComponent } from '../icons/image-icon.component';
import { PhoneIconComponent } from '../icons/phone-icon.component';
import { VideoIconComponent } from '../icons/video-icon.component';
import { Trash2IconComponent } from '../icons/trash2-icon.component';

@Component({
  selector: 'app-chat',
  template: `
    <div class="absolute inset-0 z-50 bg-black flex flex-col">
       <!-- Header -->
      <div class="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0" style="padding-top: calc(0.75rem + env(safe-area-inset-top));">
        <div class="flex items-center gap-2">
            @if (activeChat()) {
                <button (click)="backToList()" class="text-slate-400 mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div class="flex flex-col">
                    <span class="font-black text-white text-sm">{{ activeChat()?.name }}</span>
                    <span class="text-[9px]" [class.text-emerald-500]="chatService.isConnected()" [class.text-rose-500]="!chatService.isConnected()">
                        {{ chatService.isConnected() ? 'Online' : 'Offline' }}
                    </span>
                </div>
            } @else {
                <h2 class="font-black text-amber-400 text-lg tracking-wider">Messenger</h2>
                <div class="w-2 h-2 rounded-full" [class.bg-emerald-500]="chatService.isConnected()" [class.bg-rose-500]="!chatService.isConnected()"></div>
            }
        </div>
        
        <div class="flex items-center gap-3">
          @if (activeChat()) {
            <button (click)="startCall('audio')" class="text-slate-400 hover:text-amber-400 p-1">
              <app-phone-icon [size]="18"></app-phone-icon>
            </button>
            <button (click)="startCall('video')" class="text-slate-400 hover:text-amber-400 p-1">
              <app-video-icon [size]="18"></app-video-icon>
            </button>
          }
          <button (click)="close.emit()" class="text-slate-400 hover:text-white">
            <app-x-circle-icon [size]="24"></app-x-circle-icon>
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      @if (!activeChat()) {
          <!-- Tabs for Chats vs Requests -->
          <div class="flex bg-slate-900 border-b border-slate-800">
             <button (click)="viewMode.set('chats')" 
                class="flex-1 py-3 text-xs font-bold uppercase relative"
                [class.text-amber-400]="viewMode() === 'chats'"
                [class.text-slate-500]="viewMode() !== 'chats'">
                Chats
                @if(viewMode() === 'chats') { <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div> }
             </button>
             <button (click)="viewMode.set('requests')" 
                class="flex-1 py-3 text-xs font-bold uppercase relative flex items-center justify-center gap-1"
                [class.text-amber-400]="viewMode() === 'requests'"
                [class.text-slate-500]="viewMode() !== 'requests'">
                Requests
                @if(requests().length > 0) {
                    <span class="bg-rose-500 text-white text-[9px] rounded-full px-1.5 h-4 flex items-center justify-center">{{ requests().length }}</span>
                }
                @if(viewMode() === 'requests') { <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div> }
             </button>
          </div>

          <div class="flex-1 overflow-y-auto bg-black p-4 space-y-2">
            
            @if(viewMode() === 'chats') {
                <!-- Add Contact & My QR Buttons -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <button (click)="showAddContact.set(true)" class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 active:bg-slate-800">
                        <app-plus-icon [size]="18" class="text-amber-400"></app-plus-icon>
                        <span class="text-xs font-bold text-white">Add ID</span>
                    </button>
                    <button (click)="showMyQr.set(true)" class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 active:bg-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                        <span class="text-xs font-bold text-white">My QR</span>
                    </button>
                </div>

                <!-- Contacts List -->
                @for(contact of chatService.contacts(); track contact.userId) {
                    <button (click)="openChat(contact)" class="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition-transform">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-sm uppercase shrink-0">
                            {{ contact.name.substring(0,2) }}
                        </div>
                        <div class="flex-1 text-left overflow-hidden">
                            <div class="flex justify-between items-center mb-0.5">
                                <span class="font-bold text-slate-200 text-sm truncate">{{ contact.name }}</span>
                                @if(contact.lastTimestamp) {
                                    <span class="text-[9px] text-slate-500">{{ contact.lastTimestamp | date:'shortTime' }}</span>
                                }
                            </div>
                            <p class="text-xs text-slate-500 truncate" [class.font-bold]="true" [class.text-white]="true">{{ contact.lastMessage || 'Start chatting...' }}</p>
                        </div>
                    </button>
                } @empty {
                    <div class="flex flex-col items-center justify-center h-48 opacity-50">
                        <app-message-circle-icon [size]="40" class="text-slate-600 mb-2"></app-message-circle-icon>
                        <p class="text-sm text-slate-400">No chats yet.</p>
                        <p class="text-xs text-slate-600">Add an ID or share yours to start.</p>
                    </div>
                }
            } @else {
                <!-- Requests List -->
                @for(req of requests(); track req.senderId) {
                    <div class="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-black text-sm uppercase shrink-0">
                             ?
                        </div>
                        <div class="flex-1 text-left">
                            <span class="font-bold text-slate-200 text-sm block">{{ req.senderName }}</span>
                            <span class="text-[10px] text-slate-500">sent you a friend request</span>
                        </div>
                        <div class="flex gap-2">
                             <button (click)="rejectRequest(req)" class="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-colors">
                                <app-x-circle-icon [size]="16"></app-x-circle-icon>
                             </button>
                             <button (click)="acceptRequest(req)" class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 active:bg-emerald-500 active:text-white transition-colors">
                                <app-check-icon [size]="16"></app-check-icon>
                             </button>
                        </div>
                    </div>
                } @empty {
                    <div class="flex flex-col items-center justify-center h-48 opacity-50">
                        <app-bell-icon [size]="40" class="text-slate-600 mb-2"></app-bell-icon>
                        <p class="text-sm text-slate-400">No new requests.</p>
                    </div>
                }
            }
          </div>
      } 
      
      <!-- VIEW: Active Chat Room -->
      @else {
          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 scrollbar-hide" #scrollContainer>
            @for (msg of messages(); track msg.id) {
                <div class="flex flex-col group" [class.items-end]="msg.senderId === user().id" [class.items-start]="msg.senderId !== user().id">
                    
                    @if(msg.type === 'image' && msg.imageUrl) {
                        <div class="relative group">
                            <img [src]="msg.imageUrl" 
                                class="max-w-[70%] max-h-60 rounded-xl border border-slate-700 object-cover cursor-pointer"
                                (click)="viewImage.set(msg.imageUrl)"
                            >
                            <span class="absolute bottom-1 right-2 text-[9px] text-white/80 bg-black/50 px-1 rounded">
                                {{ msg.timestamp | date:'shortTime' }}
                            </span>
                            
                            @if(msg.senderId === user().id) {
                              <button (click)="deleteMessage(msg.id!)" class="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <app-trash2-icon [size]="12"></app-trash2-icon>
                              </button>
                            }
                        </div>
                    } @else {
                        <div class="flex items-center gap-2" [class.flex-row-reverse]="msg.senderId === user().id">
                          <div 
                              class="max-w-[80%] px-4 py-2 rounded-2xl text-sm font-medium leading-snug break-words"
                              [class.bg-amber-600]="msg.senderId === user().id"
                              [class.text-white]="msg.senderId === user().id"
                              [class.rounded-tr-sm]="msg.senderId === user().id"
                              [class.bg-slate-800]="msg.senderId !== user().id"
                              [class.text-slate-200]="msg.senderId !== user().id"
                              [class.rounded-tl-sm]="msg.senderId !== user().id"
                          >
                              {{ msg.text }}
                          </div>
                          @if(msg.senderId === user().id) {
                            <button (click)="deleteMessage(msg.id!)" class="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <app-trash2-icon [size]="14"></app-trash2-icon>
                            </button>
                          }
                        </div>
                        <span class="text-[9px] text-slate-500 mt-1 px-1">
                            {{ msg.timestamp | date:'shortTime' }}
                        </span>
                    }
                    
                </div>
            }
          </div>

          <!-- Input Area -->
          <div class="bg-slate-900 p-3 pb-safe border-t border-slate-800 flex gap-2 items-end" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));">
            
            <!-- Image Button -->
             <button (click)="triggerImageUpload()" class="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 active:text-amber-400 active:border-amber-400 transition-colors shrink-0">
                <app-image-icon [size]="20"></app-image-icon>
             </button>

            <textarea 
                #msgInput
                rows="1"
                placeholder="Type a message..."
                class="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500 transition-colors resize-none max-h-32"
                [value]="messageInput()"
                (input)="messageInput.set($any($event.target).value)"
                (keydown.enter)="sendMessage($event)"
            ></textarea>
            <button 
                (click)="sendMessage()"
                [disabled]="!messageInput().trim()"
                class="w-11 h-11 bg-amber-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-700 active:scale-95 transition-all shrink-0">
                <app-upload-icon [size]="20" class="rotate-90"></app-upload-icon>
            </button>
          </div>
          
          <input #imageInput type="file" accept="image/*" class="hidden" (change)="handleImageSelected($event)">
      }
      
      <!-- MODAL: Image View (Lightbox) -->
      @if (viewImage()) {
          <div class="absolute inset-0 z-[70] bg-black flex flex-col animate-in fade-in duration-200" (click)="viewImage.set(null)">
              <div class="absolute top-4 right-4 z-[80]">
                 <button class="bg-black/50 p-2 rounded-full text-white">
                    <app-x-circle-icon [size]="24"></app-x-circle-icon>
                 </button>
              </div>
              <div class="flex-1 flex items-center justify-center p-2">
                 <img [src]="viewImage()" class="max-w-full max-h-full object-contain">
              </div>
          </div>
      }

      <!-- MODAL: My QR -->
      @if (showMyQr()) {
          <div class="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
              <div class="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 class="text-black font-black text-lg mb-1">{{ user().name }}</h3>
                  <p class="text-gray-500 text-xs mb-4">Scan to chat with me</p>
                  
                  <div class="bg-white p-2 border-2 border-black rounded-xl mb-4">
                      <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + getQrData()" class="w-48 h-48 object-contain">
                  </div>
                  
                  <p class="text-[10px] font-mono text-gray-400 mb-1">USER ID</p>
                  <div class="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg w-full mb-4">
                      <code class="text-xs text-black font-bold flex-1 truncate">{{ user().id }}</code>
                      <button (click)="copyId()" class="text-amber-600 font-bold text-xs">COPY</button>
                  </div>

                  <button (click)="showMyQr.set(false)" class="w-full bg-black text-white py-3 rounded-xl font-bold">Close</button>
              </div>
          </div>
      }

      <!-- MODAL: Send Request -->
      @if (showAddContact()) {
        <div class="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
             <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl">
                <h3 class="text-white font-black text-lg mb-1">Add Friend</h3>
                <p class="text-slate-400 text-xs mb-4">Enter their ID to send a request.</p>
                
                <input 
                    placeholder="Enter User ID" 
                    class="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl mb-4 outline-none focus:border-amber-500"
                    [value]="newContactId()"
                    (input)="newContactId.set($any($event.target).value)"
                >
                
                <button (click)="sendRequest()" class="w-full bg-amber-600 text-white py-3 rounded-xl font-bold mb-2">Send Request</button>
                <button (click)="scanQrToAdd()" class="w-full bg-slate-800 text-white py-3 rounded-xl font-bold mb-2 border border-slate-700">Scan QR Code</button>
                <button (click)="showAddContact.set(false)" class="w-full text-slate-500 py-2 text-xs">Cancel</button>
             </div>
        </div>
      }

      <!-- MODAL: Calling UI -->
      @if (activeCall()) {
        <div class="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div class="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-4xl uppercase mb-8 shadow-2xl animate-pulse">
            {{ activeCall()?.callerName?.substring(0,2) }}
          </div>
          
          <h2 class="text-2xl font-black text-white mb-2">{{ activeCall()?.callerName }}</h2>
          <p class="text-amber-500 font-bold uppercase tracking-widest text-xs mb-12">
            {{ activeCall()?.status === 'ringing' ? (isIncoming() ? 'Incoming Call...' : 'Calling...') : 'Connected' }}
          </p>

          <div class="flex gap-8">
            @if (isIncoming() && activeCall()?.status === 'ringing') {
              <button (click)="answerCall()" class="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
                <app-phone-icon [size]="28"></app-phone-icon>
              </button>
            }
            <button (click)="endCall()" class="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
              <app-phone-icon [size]="28" class="rotate-[135deg]"></app-phone-icon>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  imports: [CommonModule, XCircleIconComponent, UploadIconComponent, PlusIconComponent, BellIconComponent, CheckIconComponent, MessageCircleIconComponent, ImageIconComponent, PhoneIconComponent, VideoIconComponent, Trash2IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements AfterViewChecked {
  user = input.required<UserData>();
  close = output<void>();
  openScanner = output<void>(); 
  
  chatService = inject(ChatService);
  messages = this.chatService.activeMessages;
  requests = this.chatService.incomingRequests;
  
  activeChat = signal<ChatContact | null>(null);
  viewMode = signal<'chats' | 'requests'>('chats');
  messageInput = signal('');
  
  // Modals
  showMyQr = signal(false);
  showAddContact = signal(false);
  newContactId = signal('');
  viewImage = signal<string | null>(null);
  
  // Calling
  activeCall = signal<any | null>(null);
  isIncoming = signal(false);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
        // Start listening to contacts and requests
        const u = this.user();
        if (u) {
            this.chatService.listenToUserData(u.id);
            this.chatService.listenToCalls(u.id, (call) => {
              if (call) {
                this.activeCall.set(call);
                this.isIncoming.set(true);
              } else if (this.isIncoming()) {
                this.activeCall.set(null);
                this.isIncoming.set(false);
              }
            });
        }
    });

    effect(() => {
        const active = this.activeChat();
        if (active) {
            this.chatService.listenToMessages(active.chatId);
        }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer)
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  backToList() {
      if (this.activeChat()) {
          this.chatService.stopListeningMessages(this.activeChat()!.chatId);
      }
      this.activeChat.set(null);
  }

  openChat(contact: ChatContact) {
      this.activeChat.set(contact);
  }

  sendMessage(event?: Event) {
    if (event) {
        if ((event as KeyboardEvent).shiftKey) return;
        event.preventDefault();
    }

    const text = this.messageInput().trim();
    const chat = this.activeChat();
    const me = this.user();

    if (!text || !chat || !me) return;

    this.chatService.sendMessage(chat.chatId, text, me.id, me.id, chat.userId, 'text');
    this.messageInput.set('');
  }

  // --- Image Handling ---

  triggerImageUpload() {
      if(this.imageInput) this.imageInput.nativeElement.click();
  }

  handleImageSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
          const file = input.files[0];
          this.compressAndSendImage(file);
      }
      input.value = '';
  }

  compressAndSendImage(file: File) {
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800; // Resize to max 800px width
              const scaleSize = MAX_WIDTH / img.width;
              const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
              const height = (scaleSize < 1) ? img.height * scaleSize : img.height;

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);

              // Compress to JPEG 0.6 quality
              const base64 = canvas.toDataURL('image/jpeg', 0.6);
              
              const chat = this.activeChat();
              const me = this.user();
              if (chat && me) {
                   this.chatService.sendMessage(chat.chatId, base64, me.id, me.id, chat.userId, 'image');
              }
          };
          img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
  }

  async deleteMessage(msgId: string) {
    const chat = this.activeChat();
    if (!chat || !confirm('Delete this message for everyone?')) return;
    await this.chatService.deleteMessage(chat.chatId, msgId);
  }

  // --- Calling ---

  async startCall(type: 'audio' | 'video') {
    const chat = this.activeChat();
    const me = this.user();
    if (!chat || !me) return;

    this.isIncoming.set(false);
    this.activeCall.set({
      callerId: me.id,
      callerName: chat.name,
      type,
      status: 'ringing'
    });

    await this.chatService.sendCallSignal(chat.userId, me.id, me.name, type);
  }

  async answerCall() {
    const call = this.activeCall();
    const me = this.user();
    if (!call || !me) return;

    await this.chatService.updateCallStatus(me.id, call.callerId, 'accepted');
    // In a real app, we'd start WebRTC here. For now, we just show "Connected"
  }

  async endCall() {
    const call = this.activeCall();
    const me = this.user();
    const chat = this.activeChat();
    if (!call || !me) return;

    if (this.isIncoming()) {
      await this.chatService.updateCallStatus(me.id, call.callerId, 'ended');
    } else if (chat) {
      await this.chatService.updateCallStatus(chat.userId, me.id, 'ended');
    }
    
    this.activeCall.set(null);
  }

  // --- Utility ---

  getQrData() {
      const data = {
          type: 'fw_user_id',
          id: this.user().id,
          name: this.user().name
      };
      return encodeURIComponent(JSON.stringify(data));
  }

  async copyId() {
      await navigator.clipboard.writeText(this.user().id);
      alert('ID Copied!');
  }

  // --- Request Logic ---

  async sendRequest() {
      const targetId = this.newContactId().trim();
      const me = this.user();

      if (!targetId) {
          alert('Please enter an ID');
          return;
      }
      if (targetId === me.id) {
          alert('You cannot add yourself');
          return;
      }

      try {
          await this.chatService.sendFriendRequest(me.id, me.name, targetId);
          alert('Friend request sent!');
          this.showAddContact.set(false);
          this.newContactId.set('');
      } catch (err) {
          alert('Failed to send request. Check ID and try again.');
          console.error(err);
      }
  }

  async acceptRequest(req: FriendRequest) {
      const me = this.user();
      try {
          await this.chatService.acceptFriendRequest(me.id, me.name, req);
          // Switch to chats tab
          this.viewMode.set('chats');
      } catch (err) {
          console.error(err);
      }
  }

  async rejectRequest(req: FriendRequest) {
      const me = this.user();
      if(confirm('Reject this request?')) {
          await this.chatService.rejectFriendRequest(me.id, req.senderId);
      }
  }

  scanQrToAdd() {
      this.showAddContact.set(false);
      this.openScanner.emit();
  }
}