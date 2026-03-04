import { Component, ChangeDetectionStrategy, signal, inject, effect, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, UserData } from './services/data.service';
import { ChatService } from './services/chat.service';
import { LoginComponent } from './components/login/login.component';
import { CalculatorComponent } from './components/calculator/calculator.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { ChatComponent } from './components/chat/chat.component'; 
import { StoreIconComponent } from './components/icons/store-icon.component';
import { UsersIconComponent } from './components/icons/users-icon.component';
import { CalculatorIconComponent } from './components/icons/calculator-icon.component';
import { LogoutIconComponent } from './components/icons/logout-icon.component';
import { CameraIconComponent } from './components/icons/camera-icon.component';
import { MessageCircleIconComponent } from './components/icons/message-circle-icon.component';
import { Title } from '@angular/platform-browser';

type AppState = 'initializing' | 'error' | 'login' | 'pin-lock' | 'set-pin' | 'app' | 'scanner' | 'chat';
const SESSION_KEY = 'fw_user_session';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LoginComponent,
    CalculatorComponent,
    AdminPanelComponent,
    ScannerComponent,
    ChatComponent,
    StoreIconComponent,
    UsersIconComponent,
    CalculatorIconComponent,
    LogoutIconComponent,
    CameraIconComponent,
    MessageCircleIconComponent
  ],
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);
  private chatService = inject(ChatService);
  private titleService = inject(Title);

  appState = signal<AppState>('initializing');
  private previousState: AppState = 'app';
  
  isAdmin = signal(false);
  currentUser = signal<UserData | null>(null);
  activeTab = signal<'calc' | 'admin'>('calc');
  loginError = signal<string | null>(null);
  isLoggingIn = signal(false);
  
  adminSettings = this.dataService.adminSettings;
  users = this.dataService.allUsers;

  userExpiryStatus = computed(() => {
    const user = this.currentUser();
    // Don't show status if no user OR if it is Admin
    if (!user || this.isAdmin()) {
        return null;
    }
    
    if (!user.expiresAt) {
      return { text: 'သက်တမ်းအကန့်အသတ်မရှိ', colorClass: 'text-emerald-400 bg-emerald-500/10' };
    }

    const expiryDate = new Date(user.expiresAt);
    const now = new Date();
    expiryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `သက်တမ်းကုန်ဆုံး`, colorClass: 'text-rose-400 bg-rose-500/10' };
    }
    if (diffDays === 0) {
       return { text: `ယနေ့ သက်တမ်းကုန်မည်`, colorClass: 'text-amber-400 bg-amber-500/10' };
    }
    if (diffDays <= 7) {
      return { text: `${diffDays} ရက်အတွင်း ကုန်ဆုံးမည်`, colorClass: 'text-amber-400 bg-amber-500/10' };
    }
    return { text: `${diffDays} ရက်အတွင်း ကုန်ဆုံးမည်`, colorClass: 'text-slate-400 bg-slate-500/10' };
  });

  constructor() {
    effect(() => {
      const settings = this.adminSettings();
      if (settings?.shopName) {
          this.titleService.setTitle(settings.shopName);
      }
    });
  }

  async ngOnInit() {
    this.appState.set('initializing');
    await this.dataService.initialize();

    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      try {
        const user: UserData = JSON.parse(sessionData);
        
        if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
          this.handleLogout('Key သက်တမ်းကုန်နေပါသည်');
          return;
        }

        const deviceId = this.getDeviceId();
        if (user.deviceId !== deviceId) {
          this.handleLogout('ဤအကောင့်သည် အခြားစက်အတွက်သာဖြစ်သည်');
          return;
        }
        
        this.currentUser.set(user);
        this.dataService.currentUser.set(user);
        this.isAdmin.set(false);

        if (user.pin) {
          this.appState.set('pin-lock');
        } else {
          this.appState.set('set-pin');
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
        this.appState.set('login');
      }
    } else {
        const initState = this.dataService.adminSettings() ? 'login' : 'error';
        this.appState.set(initState);
    }
  }

  retry() {
    location.reload();
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('fw_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('fw_device_id', deviceId);
    }
    return deviceId;
  }

  handleLogin(loginInput: string) {
    this.isLoggingIn.set(true);
    this.loginError.set(null);
    
    const input = loginInput.trim();
    const settings = this.adminSettings();

    if (settings && input.toUpperCase() === settings.masterPass.toUpperCase()) {
      this.isAdmin.set(true);
      
      // Create a virtual user for Admin to enable chat features
      // This ID is constant so chat history is preserved for Admin
      const adminUser: UserData = {
          id: 'ADMIN_ACCOUNT',
          name: settings.shopName || 'Admin',
          key: 'ADMIN',
          deviceId: 'ADMIN_DEVICE',
          createdAt: new Date().toISOString(),
          expiresAt: null
      };
      this.currentUser.set(adminUser);
      this.dataService.currentUser.set(adminUser);

      this.appState.set('app');
      this.activeTab.set('calc');
      this.isLoggingIn.set(false);
      return;
    }

    try {
      const user: UserData = JSON.parse(atob(input));

      if (!user || !user.id || !user.key || !user.createdAt) {
        throw new Error('Invalid token structure');
      }

      if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        this.loginError.set('ဤ Login Token သည် သက်တမ်းကုန်နေပါသည်');
        this.isLoggingIn.set(false);
        return;
      }

      const deviceId = this.getDeviceId();
      const sessionUser: UserData = { ...user, deviceId: deviceId };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

      this.currentUser.set(sessionUser);
      this.dataService.currentUser.set(sessionUser);
      this.isAdmin.set(false);
      this.appState.set('set-pin');
      this.isLoggingIn.set(false);

    } catch (error) {
      this.loginError.set('Login Token မမှန်ပါ။ Admin ထံမှရသော စာသားအားလုံးကို copy ကူးပြီးထည့်ပါ');
      this.isLoggingIn.set(false);
    }
  }

  handlePinLogin(pin: string) {
    this.isLoggingIn.set(true);
    this.loginError.set(null);
    const user = this.currentUser();

    if (user && user.pin === pin) {
      this.appState.set('app');
      this.dataService.currentUser.set(user);
    } else {
      this.loginError.set('PIN မမှန်ပါ။');
    }
    this.isLoggingIn.set(false);
  }

  handleSetPin(pin: string) {
    const user = this.currentUser();
    if (!user) return;

    const updatedUser = { ...user, pin };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    this.currentUser.set(updatedUser);
    this.dataService.currentUser.set(updatedUser);
    this.appState.set('app');
  }
  
  handleSkipPin() {
    this.appState.set('app');
  }

  handleLogout(error: string | null = null) {
    localStorage.removeItem(SESSION_KEY);
    this.currentUser.set(null);
    this.dataService.currentUser.set(null);
    this.appState.set('login');
    this.isAdmin.set(false);
    this.loginError.set(error);
  }

  toggleTab() {
    this.activeTab.update(current => current === 'calc' ? 'admin' : 'calc');
  }
  
  openScanner() {
    if (this.appState() === 'app' || this.appState() === 'chat') {
      if (this.appState() !== 'scanner') {
        this.previousState = this.appState();
        this.appState.set('scanner');
      }
    }
  }

  closeScanner() {
    this.appState.set(this.previousState);
  }

  openChat() {
    if (this.appState() === 'app') {
      this.previousState = 'app';
      this.appState.set('chat');
    }
  }

  closeChat() {
    this.appState.set(this.previousState);
  }

  clearLoginError() {
      this.loginError.set(null);
  }

  // Handle when Scanner finds a User ID via QR
  async handleUserFound(contact: {id: string, name: string}) {
      const me = this.currentUser();
      if (!me) return;
      
      if (contact.id === me.id) {
          alert('You scanned your own ID.');
          this.closeScanner();
          return;
      }

      // If scanning a mobile QR, name might be 'Mobile User'. 
      // We show the ID for confirmation if the name is generic.
      const displayName = contact.name === 'Mobile User' ? `ID: ${contact.id}` : contact.name;
      const confirmAdd = confirm(`Send friend request to ${displayName}?`);
      
      if (confirmAdd) {
          // Send request logic via chat service
          await this.chatService.sendFriendRequest(me.id, me.name, contact.id);
          alert('Request Sent!');
          this.appState.set('chat'); 
      } else {
          this.closeScanner();
      }
  }
}