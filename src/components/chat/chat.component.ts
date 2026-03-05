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
import { DownloadIconComponent } from '../icons/download-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';

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

          <div class="flex-1 overflow-y-auto bg-black p-4 space-y-2 min-h-0 overscroll-y-contain">
            
            @if(viewMode() === 'chats') {
                <!-- Add Contact & My QR Buttons -->
                <div class="grid grid-cols-2 gap-3 mb-4 shrink-0">
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
                    <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 relative group active:bg-slate-800 transition-colors">
                        <!-- Main Chat Click Area -->
                        <button (click)="openChat(contact)" class="flex-1 flex items-center gap-3 text-left min-w-0 outline-none">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-black text-sm uppercase shrink-0" [class]="getAvatarColor(contact.name)">
                                {{ contact.name.substring(0,2) }}
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <div class="flex justify-between items-center mb-0.5">
                                    <span class="font-bold text-slate-200 text-sm truncate">{{ contact.name }}</span>
                                    @if(contact.lastTimestamp) {
                                        <span class="text-[9px] text-slate-500">{{ contact.lastTimestamp | date:'shortTime' }}</span>
                                    }
                                </div>
                                <p class="text-xs text-slate-500 truncate" [class.font-bold]="true" [class.text-white]="true">{{ contact.lastMessage || 'Start chatting...' }}</p>
                            </div>
                        </button>
                        
                        <!-- Delete Button -->
                        <button (click)="confirmRemoveContact(contact, $event)" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 z-10">
                            <app-trash2-icon [size]="18"></app-trash2-icon>
                        </button>
                    </div>
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
          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 scrollbar-hide min-h-0 overscroll-y-contain" #scrollContainer>
            @for (msg of messages(); track msg.id) {
                <div class="flex flex-col group" [class.items-end]="msg.senderId === user().id" [class.items-start]="msg.senderId !== user().id">
                    
                    @if(msg.type === 'image' && msg.imageUrl) {
                        <div class="relative group max-w-[70%]">
                            <img [src]="msg.imageUrl" 
                                class="w-full h-auto max-h-60 rounded-xl border border-slate-700 object-cover cursor-pointer z-0"
                                (click)="viewImage.set(msg.imageUrl)"
                            >
                            <span class="absolute bottom-1 right-2 text-[9px] text-white/80 bg-black/50 px-1 rounded pointer-events-none z-10">
                                {{ msg.timestamp | date:'shortTime' }}
                            </span>
                            
                            @if(msg.senderId === user().id) {
                              <button (click)="deleteMessage($event, msg.id!)" class="absolute top-2 right-2 bg-rose-600 text-white p-2 rounded-full shadow-xl z-50 active:scale-90 transition-transform hover:bg-rose-700 cursor-pointer">
                                <app-trash2-icon [size]="18"></app-trash2-icon>
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
                            <button (click)="deleteMessage($event, msg.id!)" class="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div class="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-200">
              
              <!-- Header / Close Button -->
              <div class="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-end z-[210] pointer-events-none" style="padding-top: calc(1rem + env(safe-area-inset-top));">
                 <button (click)="viewImage.set(null)" class="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-full text-white active:bg-white/20 transition-colors shadow-lg cursor-pointer">
                    <app-x-circle-icon [size]="32"></app-x-circle-icon>
                 </button>
              </div>

              <!-- Scrollable Image Area -->
              <div class="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center" (click)="viewImage.set(null)">
                 <!-- Spacer for top bar -->
                 <div class="w-full h-20 shrink-0"></div>
                 
                 <img [src]="viewImage()" 
                      class="w-full max-w-4xl object-contain shadow-2xl"
                      (click)="$event.stopPropagation()"
                 >
                 
                 <!-- Spacer for bottom bar -->
                 <div class="w-full h-32 shrink-0"></div>
              </div>
              
              <!-- Bottom Actions -->
              <div class="absolute bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center gap-12 z-[210] pointer-events-none" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));">
                  <button (click)="downloadImage(viewImage()!)" class="pointer-events-auto flex flex-col items-center gap-2 text-white hover:text-amber-400 transition-colors group cursor-pointer">
                      <div class="bg-white/10 p-4 rounded-full backdrop-blur-md group-active:bg-white/30 transition-colors border border-white/10 shadow-lg">
                          <app-download-icon [size]="24"></app-download-icon>
                      </div>
                      <span class="text-xs font-bold shadow-black drop-shadow-md">Save</span>
                  </button>
                  <button (click)="shareImage(viewImage()!)" class="pointer-events-auto flex flex-col items-center gap-2 text-white hover:text-amber-400 transition-colors group cursor-pointer">
                      <div class="bg-white/10 p-4 rounded-full backdrop-blur-md group-active:bg-white/30 transition-colors border border-white/10 shadow-lg">
                          <app-share-icon [size]="24"></app-share-icon>
                      </div>
                      <span class="text-xs font-bold shadow-black drop-shadow-md">Share</span>
                  </button>
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

      <!-- MODAL: Confirm Delete -->
      @if (contactToDelete()) {
        <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
             <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 class="text-white font-black text-lg mb-2">Remove Contact?</h3>
                <p class="text-slate-400 text-sm mb-6">Are you sure you want to remove <strong class="text-white">{{ contactToDelete()?.name }}</strong> from your contacts?</p>
                
                <div class="flex gap-3">
                    <button (click)="contactToDelete.set(null)" class="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold border border-slate-700 active:bg-slate-700 transition-colors">Cancel</button>
                    <button (click)="executeRemoveContact()" class="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold active:bg-rose-700 transition-colors">Remove</button>
                </div>
             </div>
        </div>
      }

      <!-- MODAL: Confirm Delete Message -->
      @if (messageToDelete()) {
        <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
             <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 class="text-white font-black text-lg mb-2">Delete Message?</h3>
                <p class="text-slate-400 text-sm mb-6">This message will be removed for everyone in the chat.</p>
                
                <div class="flex gap-3">
                    <button (click)="messageToDelete.set(null)" class="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold border border-slate-700 active:bg-slate-700 transition-colors">Cancel</button>
                    <button (click)="executeDeleteMessage()" class="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold active:bg-rose-700 transition-colors">Delete</button>
                </div>
             </div>
        </div>
      }

      <!-- MODAL: Calling UI -->
      @if (activeCall()) {
        <div class="absolute inset-0 z-[100] bg-[#A99494] flex flex-col animate-in fade-in duration-300 overflow-hidden">
          
          <!-- Video Background (if connected and video available) -->
          <div class="absolute inset-0 z-0">
             <video #remoteVideo autoplay playsinline class="w-full h-full object-cover opacity-0 transition-opacity duration-500" [class.opacity-100]="activeCall()?.status === 'connected' && remoteStream"></video>
          </div>
          
          <!-- Local Video (PIP) - Only show if camera is on -->
          @if (isCameraOn && localStream) {
             <div class="absolute top-20 right-4 w-24 h-32 bg-black/20 rounded-xl overflow-hidden border border-white/20 shadow-xl z-10 backdrop-blur-sm">
                 <video #localVideo autoplay playsinline muted class="w-full h-full object-cover"></video>
             </div>
          }

          <!-- UI Overlay -->
          <div class="relative z-20 flex flex-col h-full">
              
              <!-- Top Bar -->
              <div class="flex justify-between items-center p-4 pt-8 text-white">
                  <button (click)="endCall()" class="p-2 rounded-full active:bg-white/10 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div class="flex gap-2">
                      <button (click)="showFeatureNotAvailable()" class="p-2 rounded-full active:bg-white/10 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      </button>
                      <button (click)="showFeatureNotAvailable()" class="p-2 rounded-full active:bg-white/10 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                  </div>
              </div>

              <!-- Center Content -->
              <div class="flex-1 flex flex-col items-center justify-start pt-16">
                  <!-- Profile Pic -->
                  <div class="w-32 h-32 rounded-full overflow-hidden shadow-2xl mb-6 relative border-2 border-white/10">
                       <div class="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-4xl uppercase">
                          {{ activeCall()?.callerName?.substring(0,2) }}
                       </div>
                  </div>
                  
                  <h2 class="text-3xl font-medium text-white mb-2 tracking-wide">{{ activeCall()?.callerName }}</h2>
                  <p class="text-white/90 text-lg font-light">
                    {{ activeCall()?.status === 'ringing' ? (isIncoming() ? 'Incoming call...' : 'Calling...') : (activeCall()?.status === 'connected' ? '00:00' : 'Connecting...') }}
                  </p>
              </div>

              <!-- Bottom Controls -->
              <div class="pb-12 px-6">
                  
                  <!-- Incoming Call Actions -->
                  @if (isIncoming() && activeCall()?.status === 'ringing') {
                      <div class="flex justify-around items-center mb-8">
                          <div class="flex flex-col items-center gap-2">
                              <button (click)="endCall()" class="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform">
                                  <app-phone-icon [size]="28" class="rotate-[135deg]"></app-phone-icon>
                              </button>
                              <span class="text-white text-sm">Decline</span>
                          </div>
                          <div class="flex flex-col items-center gap-2">
                              <button (click)="answerCall()" class="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform animate-bounce">
                                  <app-phone-icon [size]="28"></app-phone-icon>
                              </button>
                              <span class="text-white text-sm">Answer</span>
                          </div>
                      </div>
                  } @else {
                      <!-- Active/Outgoing Call Controls -->
                      <div class="flex justify-between items-center max-w-sm mx-auto w-full">
                          
                          <!-- Video Toggle -->
                          <button (click)="toggleCamera()" class="flex flex-col items-center gap-1 group">
                              <div class="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white group-active:bg-white/20 transition-colors" [class.bg-white]="isCameraOn" [class.text-black]="isCameraOn">
                                  @if(isCameraOn) {
                                      <app-video-icon [size]="20"></app-video-icon>
                                  } @else {
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.777-.416L16 10.934V13Z"/><path d="M14 4.5v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                  }
                              </div>
                          </button>

                          <!-- Mute Toggle -->
                          <button (click)="toggleMic()" class="flex flex-col items-center gap-1 group">
                              <div class="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white group-active:bg-white/20 transition-colors" [class.bg-white]="!isMicOn" [class.text-black]="!isMicOn">
                                  @if(isMicOn) {
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                  } @else {
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                                  }
                              </div>
                          </button>

                          <!-- Media/Cast -->
                          <button (click)="toggleScreenShare()" class="flex flex-col items-center gap-1 group">
                              <div class="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white group-active:bg-white/20 transition-colors" [class.bg-white]="isScreenSharing" [class.text-black]="isScreenSharing">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10h20"/><path d="M2 14h20"/><path d="M2 6h20"/><path d="M2 18h20"/></svg>
                              </div>
                          </button>

                          <!-- Speaker Toggle -->
                          <button (click)="toggleSpeaker()" class="flex flex-col items-center gap-1 group">
                              <div class="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white group-active:bg-white/20 transition-colors" [class.bg-white]="isSpeakerOn" [class.text-black]="isSpeakerOn">
                                  @if(isSpeakerOn) {
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                                  } @else {
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                  }
                              </div>
                          </button>

                          <!-- End Call -->
                          <button (click)="endCall()" class="flex flex-col items-center gap-1 group">
                              <div class="w-14 h-14 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                                  <app-phone-icon [size]="28" class="rotate-[135deg]"></app-phone-icon>
                              </div>
                          </button>

                      </div>
                  }
              </div>
          </div>
        </div>
      }
      <!-- Permission Error Modal -->
      @if (permissionError()) {
        <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl text-center">
            <div class="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.69 14 12 2 4.31 14M12 18h.01M12 16v-4"/></svg>
            </div>
            <h3 class="text-white font-black text-lg mb-2">Permission Required</h3>
            <p class="text-slate-400 text-sm mb-6 whitespace-pre-line">{{ permissionError() }}</p>
            <div class="flex gap-3">
                <button (click)="permissionError.set(null)" class="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors">
                  Dismiss
                </button>
                <button (click)="retryCall()" class="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors">
                  Retry
                </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  imports: [CommonModule, XCircleIconComponent, UploadIconComponent, PlusIconComponent, BellIconComponent, CheckIconComponent, MessageCircleIconComponent, ImageIconComponent, PhoneIconComponent, VideoIconComponent, Trash2IconComponent, DownloadIconComponent, ShareIconComponent],
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
  contactToDelete = signal<ChatContact | null>(null);
  messageToDelete = signal<string | null>(null);
  permissionError = signal<string | null>(null);
  
  // Calling
  activeCall = signal<any | null>(null);
  isIncoming = signal(false);
  lastCallType: 'audio' | 'video' | null = null;
  
  // WebRTC
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  peerConnection: RTCPeerConnection | null = null;
  isMicOn = true;
  isCameraOn = true;
  pendingCandidates: RTCIceCandidateInit[] = [];
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  constructor() {
    effect(() => {
        // Start listening to contacts and requests
        const u = this.user();
        if (u) {
            this.chatService.listenToUserData(u.id);
            this.chatService.listenToCalls(u.id, (call) => {
              if (call) {
                // If we are already in a call, ignore or handle busy
                if (this.activeCall() && this.activeCall().status === 'connected') return;
                
                this.activeCall.set(call);
                this.isIncoming.set(true);
                
                // If call is ended remotely
                if (call.status === 'ended') {
                    this.cleanupCall();
                }
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

  confirmRemoveContact(contact: ChatContact, event: Event) {
    console.log('Confirm remove contact clicked', contact);
    event.stopPropagation();
    this.contactToDelete.set(contact);
  }

  async executeRemoveContact() {
    const contact = this.contactToDelete();
    if (!contact) return;
    
    console.log('Executing remove contact', contact);
    this.contactToDelete.set(null);
    
    // Optimistically remove from UI immediately
    this.chatService.contacts.update(list => list.filter(c => c.userId !== contact.userId));
    
    try {
      await this.chatService.removeContact(this.user().id, contact.userId);
    } catch (err) {
      console.error('Failed to remove contact', err);
    }
  }

  getAvatarColor(name: string): string {
    const colors = [
      'from-amber-500 to-amber-700',
      'from-emerald-500 to-emerald-700',
      'from-blue-500 to-blue-700',
      'from-rose-500 to-rose-700',
      'from-violet-500 to-violet-700',
      'from-cyan-500 to-cyan-700'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
              if (ctx) {
                  // Fill white background to handle transparency
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
              }

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

  async downloadImage(imageUrl: string) {
    if (!imageUrl) return;
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // 1. Try File System Access API (Desktop Chrome/Edge)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: `photo-${Date.now()}.jpg`,
                    types: [{
                        description: 'Image file',
                        accept: { 'image/jpeg': ['.jpg'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('File System Access API failed', err);
                } else {
                    return; // User cancelled
                }
            }
        }

        // 2. Try Web Share API (Mobile) - often the best way to "save" on mobile
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Save Photo',
                    text: 'Save this photo'
                });
                return;
            } catch (shareErr) {
                console.warn('Share failed, falling back to download', shareErr);
            }
        }

        // 3. Fallback: Anchor Tag Download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photo-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        console.error('Download failed', err);
        // 4. Final Fallback: Open in new tab
        window.open(imageUrl, '_blank');
    }
  }

  async shareImage(imageUrl: string) {
    if (!imageUrl) return;
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Shared Photo',
                text: 'Check out this photo!'
            });
        } else {
            // Fallback for desktop or unsupported browsers
            this.downloadImage(imageUrl);
            alert('Sharing not supported on this device. Image saved instead.');
        }
    } catch (err) {
        console.error('Share failed', err);
        // Fallback: Try to share just the URL or download
        if (navigator.share) {
             try {
                 await navigator.share({
                    title: 'Shared Photo',
                    url: imageUrl
                 });
             } catch (e) {
                 this.downloadImage(imageUrl);
             }
        } else {
            this.downloadImage(imageUrl);
        }
    }
  }

  deleteMessage(event: Event, msgId: string) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!msgId) {
        console.error('Message ID missing');
        return;
    }

    this.messageToDelete.set(msgId);
  }

  async executeDeleteMessage() {
    const msgId = this.messageToDelete();
    if (!msgId) return;
    
    const chat = this.activeChat();
    if (!chat) return;
    
    this.messageToDelete.set(null);
    
    try {
        await this.chatService.deleteMessage(chat.chatId, msgId);
    } catch (err) {
        console.error('Failed to delete message', err);
        alert('Could not delete message. Please try again.');
    }
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
    
    // Initialize WebRTC
    await this.initWebRTC(type === 'video');
    
    // Create Offer
    if (this.peerConnection) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        // Send Offer via Signal
        // Path: calls/{targetId}/{callerId} -> calls/{chat.userId}/{me.id}
        await this.chatService.sendWebRTCSignal(chat.userId, me.id, 'offer', {
            type: offer.type,
            sdp: offer.sdp
        });
        
        // Listen for Answer
        this.chatService.listenToCallSignal(chat.userId, me.id, async (data) => {
            if (data?.answer && !this.peerConnection?.currentRemoteDescription) {
                const answer = new RTCSessionDescription(data.answer);
                await this.peerConnection?.setRemoteDescription(answer);
                this.activeCall.update(c => ({ ...c, status: 'connected' }));
                
                // Process pending candidates
                while (this.pendingCandidates.length > 0) {
                    const candidate = this.pendingCandidates.shift();
                    if (candidate) {
                        await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                }
            }
            if (data?.candidates) {
                const candidates = Object.values(data.candidates);
                for (const c of candidates) {
                    if (this.peerConnection?.remoteDescription) {
                        await this.peerConnection?.addIceCandidate(new RTCIceCandidate(c as any));
                    } else {
                        this.pendingCandidates.push(c as any);
                    }
                }
            }
            if (data?.status === 'ended' || data?.status === 'rejected') {
                this.cleanupCall();
            }
        });
    }
  }

  async answerCall() {
    const call = this.activeCall();
    const me = this.user();
    if (!call || !me) return;

    // Determine IDs
    // I am Callee (me.id), Caller is call.callerId
    const callerId = call.callerId;
    const myId = me.id;

    await this.chatService.updateCallStatus(myId, callerId, 'accepted');
    this.activeCall.update(c => ({ ...c, status: 'connected' }));

    // Initialize WebRTC
    await this.initWebRTC(call.type === 'video');

    // Listen for Offer first (it should be there)
    this.chatService.listenToCallSignal(myId, callerId, async (data) => {
        if (data?.offer && !this.peerConnection?.currentRemoteDescription) {
             const offer = new RTCSessionDescription(data.offer);
             await this.peerConnection?.setRemoteDescription(offer);
             
             // Process pending candidates
             while (this.pendingCandidates.length > 0) {
                 const candidate = this.pendingCandidates.shift();
                 if (candidate) {
                     await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
                 }
             }
             
             // Create Answer
             const answer = await this.peerConnection?.createAnswer();
             if (answer) {
                 await this.peerConnection?.setLocalDescription(answer);
                 // Send Answer
                 // Path: calls/{myId}/{callerId}
                 await this.chatService.sendWebRTCSignal(myId, callerId, 'answer', {
                     type: answer.type,
                     sdp: answer.sdp
                 });
             }
        }
        if (data?.candidates) {
            const candidates = Object.values(data.candidates);
            for (const c of candidates) {
                if (this.peerConnection?.remoteDescription) {
                    await this.peerConnection?.addIceCandidate(new RTCIceCandidate(c as any));
                } else {
                    this.pendingCandidates.push(c as any);
                }
            }
        }
        if (data?.status === 'ended') {
            this.cleanupCall();
        }
    });
  }

  async initWebRTC(video: boolean) {
      this.lastCallType = video ? 'video' : 'audio';
      try {
          this.permissionError.set(null); // Clear previous errors

          // Try to get media with preferred constraints
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: video ? { facingMode: 'user' } : false, 
                audio: true 
            });
          } catch (err: any) {
            console.warn('Preferred media constraints failed, trying fallback...');
            
            // Handle specific permission errors immediately
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                throw err;
            }

            // Fallback: try without specific facingMode or just audio if video fails
            if (video) {
                 try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: true 
                    });
                 } catch (e: any) {
                     if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                         throw e;
                     }
                     console.warn('Video failed, falling back to audio only', e);
                     this.localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: false, 
                        audio: true 
                    });
                 }
            } else {
                throw err;
            }
          }
          
          if (this.localVideo && this.localVideo.nativeElement) {
              this.localVideo.nativeElement.srcObject = this.localStream;
          }

          const config = {
              iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' }
              ]
          };
          
          this.peerConnection = new RTCPeerConnection(config);
          
          // Add Tracks
          this.localStream?.getTracks().forEach(track => {
              this.peerConnection?.addTrack(track, this.localStream!);
          });
          
          // Handle Remote Stream
          this.peerConnection!.ontrack = (event) => {
              this.remoteStream = event.streams[0];
              if (this.remoteVideo && this.remoteVideo.nativeElement) {
                  this.remoteVideo.nativeElement.srcObject = this.remoteStream;
              }
          };
          
          // Handle ICE Candidates
          this.peerConnection!.onicecandidate = (event) => {
              if (event.candidate) {
                  const me = this.user();
                  const call = this.activeCall();
                  if (!me || !call) return;
                  
                  // Determine path components
                  let targetId, callerId;
                  if (this.isIncoming()) {
                      // I am Callee (me.id)
                      targetId = me.id;
                      callerId = call.callerId;
                  } else {
                      // I am Caller (me.id)
                      targetId = this.activeChat()?.userId;
                      callerId = me.id;
                  }
                  
                  if (targetId && callerId) {
                      this.chatService.sendWebRTCSignal(targetId, callerId, 'candidate', event.candidate.toJSON());
                  }
              }
          };

      } catch (err: any) {
          console.error('Media access error:', err);
          let errorMessage = 'Could not access media devices.';
          
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              errorMessage = 'Camera/Microphone access denied. Please check:\n1. Browser Site Settings (lock icon in address bar).\n2. Phone Settings > Apps > Chrome > Permissions.';
          } else if (err.name === 'NotFoundError') {
              errorMessage = 'No camera or microphone found on this device.';
          } else if (err.name === 'NotReadableError') {
              errorMessage = 'Camera or Microphone is already in use by another application.';
          }
          
          this.permissionError.set(errorMessage);
          this.cleanupCall(); // Ensure call state is reset
          throw err;
      }
  }

  retryCall() {
      if (this.lastCallType) {
          this.initWebRTC(this.lastCallType === 'video');
      } else {
          this.permissionError.set(null);
      }
  }


  async endCall() {
    const call = this.activeCall();
    const me = this.user();
    const chat = this.activeChat();
    
    if (call && me) {
        if (this.isIncoming()) {
            await this.chatService.updateCallStatus(me.id, call.callerId, 'ended');
        } else if (chat) {
            await this.chatService.updateCallStatus(chat.userId, me.id, 'ended');
        }
    }
    
    this.cleanupCall();
  }
  
  cleanupCall() {
      this.activeCall.set(null);
      this.isIncoming.set(false);
      this.pendingCandidates = [];
      
      if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
      }
      if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
      }
      this.remoteStream = null;
  }
  
  toggleMic() {
      this.isMicOn = !this.isMicOn;
      if (this.localStream) {
          this.localStream.getAudioTracks().forEach(track => track.enabled = this.isMicOn);
      }
  }
  
  toggleCamera() {
      this.isCameraOn = !this.isCameraOn;
      if (this.localStream) {
          this.localStream.getVideoTracks().forEach(track => track.enabled = this.isCameraOn);
      }
  }

  isSpeakerOn = true;
  isScreenSharing = false;

  toggleSpeaker() {
      this.isSpeakerOn = !this.isSpeakerOn;
      // Note: Switching output device (earpiece/speaker) is not fully supported in mobile browsers yet.
      // We can try setSinkId if available, or just toggle state for UI.
      if (this.remoteVideo && this.remoteVideo.nativeElement && (this.remoteVideo.nativeElement as any).setSinkId) {
          // This is experimental and might not work
          // (this.remoteVideo.nativeElement as any).setSinkId(this.isSpeakerOn ? 'speaker' : 'earpiece');
      }
  }

  async toggleScreenShare() {
      if (!this.isScreenSharing) {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
              const screenTrack = stream.getVideoTracks()[0];
              
              if (this.peerConnection) {
                  const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
                  if (sender) {
                      await sender.replaceTrack(screenTrack);
                      this.isScreenSharing = true;
                      
                      // Handle stream end (user clicks "Stop sharing" in browser UI)
                      screenTrack.onended = () => {
                          this.stopScreenShare();
                      };
                  }
              }
          } catch (err) {
              console.error('Error sharing screen', err);
          }
      } else {
          this.stopScreenShare();
      }
  }

  async stopScreenShare() {
      if (this.peerConnection && this.localStream) {
          const videoTrack = this.localStream.getVideoTracks()[0];
          const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
              await sender.replaceTrack(videoTrack);
          }
      }
      this.isScreenSharing = false;
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

  showFeatureNotAvailable() {
      alert('This feature is coming soon!');
  }

  scanQrToAdd() {
      this.showAddContact.set(false);
      this.openScanner.emit();
  }
}