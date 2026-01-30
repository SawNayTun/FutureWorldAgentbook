
import { Component, ChangeDetectionStrategy, signal, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login/login.component';
import { CalculatorComponent } from './components/calculator/calculator.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { StoreIconComponent } from './components/icons/store-icon.component';
import { UsersIconComponent } from './components/icons/users-icon.component';
import { CalculatorIconComponent } from './components/icons/calculator-icon.component';
import { LogoutIconComponent } from './components/icons/logout-icon.component';
import { Title } from '@angular/platform-browser';

type AppState = 'initializing' | 'error' | 'login' | 'app';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LoginComponent,
    CalculatorComponent,
    AdminPanelComponent,
    StoreIconComponent,
    UsersIconComponent,
    CalculatorIconComponent,
    LogoutIconComponent,
  ],
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);
  private titleService = inject(Title);

  appState = signal<AppState>('initializing');
  isAdmin = signal(false);
  activeTab = signal<'calc' | 'admin'>('calc');
  loginError = signal<string | null>(null);
  isLoggingIn = signal(false);
  
  adminSettings = this.dataService.adminSettings;
  users = this.dataService.allUsers;

  constructor() {
    effect(() => {
      const settings = this.adminSettings();
      if (settings?.shopName) {
          this.titleService.setTitle(settings.shopName);
      }
    });
  }

  async ngOnInit() {
    this.initializeApp();
  }
  
  async initializeApp() {
    this.appState.set('initializing');
    const initState = await this.dataService.initialize();
    this.appState.set(initState);
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
    
    const input = loginInput.trim().toUpperCase();
    const settings = this.adminSettings();
    const users = this.users();

    if (!settings) {
      this.loginError.set('Application data could not be loaded.');
      this.isLoggingIn.set(false);
      return;
    }
    
    // Admin Login
    if (input === settings.masterPass.toUpperCase()) {
      this.isAdmin.set(true);
      this.appState.set('app');
      this.activeTab.set('calc');
      this.isLoggingIn.set(false);
      return;
    }

    // User Login
    const user = users.find(u => u.key.toUpperCase() === input);

    if (!user) {
      this.loginError.set('ကုဒ်မှားနေပါသည်');
      this.isLoggingIn.set(false);
      return;
    }

    // Check for expiration
    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      this.loginError.set('Key သက်တမ်းကုန်နေပါသည်');
      this.isLoggingIn.set(false);
      return;
    }
    
    // Device ID Check
    const deviceId = this.getDeviceId();
    if (user.deviceId && user.deviceId !== deviceId) {
      this.loginError.set('ဤကုဒ်သည် အခြားစက်တွင် အသုံးပြုနေပါသည်');
      this.isLoggingIn.set(false);
      return;
    }

    // If first login on any device, link the device
    if (!user.deviceId) {
      this.dataService.linkDeviceToUser(user.id, deviceId);
    }


    // Success
    this.isAdmin.set(false);
    this.appState.set('app');
    this.activeTab.set('calc');
    this.isLoggingIn.set(false);
  }

  handleLogout() {
    this.appState.set('login');
    this.isAdmin.set(false);
    this.loginError.set(null);
  }

  toggleTab() {
    this.activeTab.update(current => current === 'calc' ? 'admin' : 'calc');
  }

  clearLoginError() {
      this.loginError.set(null);
  }
}
