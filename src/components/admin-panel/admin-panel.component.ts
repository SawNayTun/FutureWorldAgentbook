import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, ViewChild, ElementRef } from '@angular/core';
import { DataService, UserData } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { Trash2IconComponent } from '../icons/trash2-icon.component';
import { SettingsIconComponent } from '../icons/settings-icon.component';
import { UsersIconComponent } from '../icons/users-icon.component';
import { ShareIconComponent } from '../icons/share-icon.component';
import { CheckIconComponent } from '../icons/check-icon.component';
import { DownloadIconComponent } from '../icons/download-icon.component';
import { UploadIconComponent } from '../icons/upload-icon.component';
import { PlusIconComponent } from '../icons/plus-icon.component';
import { DragScrollDirective } from '../../directives/drag-scroll.directive';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Trash2IconComponent, SettingsIconComponent, UsersIconComponent, ShareIconComponent, CheckIconComponent, DownloadIconComponent, UploadIconComponent, PlusIconComponent, DragScrollDirective],
  host: { class: 'flex-1 flex flex-col min-h-0' }
})
export class AdminPanelComponent implements OnInit {
  private dataService = inject(DataService);

  @ViewChild('restoreInput') restoreInput!: ElementRef<HTMLInputElement>;

  allUsers = this.dataService.allUsers;
  adminSettings = this.dataService.adminSettings;

  sortedUsers = computed(() => {
    const users = this.allUsers() ?? [];
    return users.slice().sort((a: UserData, b: UserData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // User creation state
  name = signal('');
  subscriptionDurationDays = signal<string>('');

  // New state for tabs and settings
  activeAdminTab = signal<'users' | 'settings'>('users');
  shopNameInput = signal('');
  masterPassInput = signal('');
  settingsSaved = signal(false);
  copiedKeyId = signal<string | null>(null);

  // Renewal modal state
  userForRenewal = signal<UserData | null>(null);
  renewalDays = signal<string>('1');

  ngOnInit() {
    const currentSettings = this.adminSettings();
    if (currentSettings) {
      this.shopNameInput.set(currentSettings.shopName);
      this.masterPassInput.set(currentSettings.masterPass);
    }
  }

  createKey() {
    if (!this.name().trim()) {
      alert('အမည်ရိုက်ထည့်ပါ');
      return;
    }
    
    let expiryValue: string | null = null;
    const durationStr = this.subscriptionDurationDays().trim();

    if (durationStr !== '') {
        const durationDays = parseInt(durationStr, 10);
        if (isNaN(durationDays) || durationDays <= 0) {
            alert('သက်တမ်းအတွက် ရက်အရေအတွက် မှန်ကန်စွာထည့်ပါ');
            return;
        }
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + durationDays);
        expiryValue = expiry.toISOString();
    }

    this.dataService.createNewUser(this.name().trim(), expiryValue);
    this.name.set('');
    this.subscriptionDurationDays.set('');
  }

  deleteUser(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
        this.dataService.deleteUser(userId);
    }
  }

  renewUser(user: UserData) {
    this.renewalDays.set('1');
    this.userForRenewal.set(user);
  }
  
  cancelRenewal() {
    this.userForRenewal.set(null);
  }

  confirmRenewal() {
    const user = this.userForRenewal();
    if (!user) return;

    const days = parseInt(this.renewalDays(), 10);
    if (isNaN(days) || days <= 0) {
        alert('Please enter a valid number of days.');
        return;
    }

    this.dataService.renewUserSubscription(user.id, days);
    this.userForRenewal.set(null);
  }

  setRenewalDays(days: number) {
    this.renewalDays.set(days.toString());
  }

  getExpiryStatus(user: UserData): { text: string; colorClass: string } {
    if (!user.expiresAt) {
      return { text: 'Never', colorClass: 'text-emerald-500' };
    }
    const expiryDate = new Date(user.expiresAt);
    const now = new Date();
    // Reset time part to compare dates only
    expiryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Expired`, colorClass: 'text-rose-500' };
    }
    if (diffDays === 0) {
       return { text: `Expires today`, colorClass: 'text-amber-500' };
    }
    if (diffDays <= 7) {
      return { text: `in ${diffDays} days`, colorClass: 'text-amber-500' };
    }
    return { text: `in ${diffDays} days`, colorClass: 'text-slate-400' };
  }

  saveSettings() {
    const shopName = this.shopNameInput().trim();
    const masterPass = this.masterPassInput().trim();

    if (!shopName || !masterPass) {
      alert('Shop name and master password cannot be empty.');
      return;
    }

    this.dataService.updateAdminSettings({ shopName, masterPass });
    this.settingsSaved.set(true);
    setTimeout(() => this.settingsSaved.set(false), 2000);
  }

  async shareKey(user: UserData) {
    try {
      // Create a clean user object for the token. Device ID is always null in the master token.
      const userTokenData = {
          id: user.id,
          name: user.name,
          key: user.key,
          createdAt: user.createdAt,
          expiresAt: user.expiresAt,
          deviceId: null 
      };

      const loginToken = btoa(JSON.stringify(userTokenData));
      const expiryText = user.expiresAt ? new Date(user.expiresAt).toLocaleDateString('en-GB') : 'Lifetime';
      
      const textToCopy = `--- Future World အကောင့် ---\n\nအမည်: ${user.name}\nသက်တမ်းကုန်ဆုံးရက်: ${expiryText}\n\nLogin Token (ဤစာသားအားလုံးကို copy ကူးပြီး app ထဲတွင်ထည့်ပါ):\n\n${loginToken}`;

      await navigator.clipboard.writeText(textToCopy);
      this.copiedKeyId.set(user.id);
      setTimeout(() => this.copiedKeyId.set(null), 2000);
    } catch (err) {
      console.error('Failed to create or copy login token: ', err);
      alert('Failed to copy login token.');
    }
  }

  factoryReset() {
    this.dataService.factoryReset();
  }

  backupData() {
    this.dataService.backupData();
  }

  triggerRestore() {
    if (confirm('This will overwrite all current data with the backup file. Are you sure you want to proceed?')) {
      this.restoreInput.nativeElement.click();
    }
  }

  handleRestoreFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const success = this.dataService.importData(jsonString);
        if (success) {
          alert('Data restored successfully! The application will now reload.');
          location.reload();
        } else {
          alert('Restore failed. The backup file is invalid or corrupted.');
        }
      } catch (error) {
        console.error('Error reading or parsing restore file:', error);
        alert('Restore failed. Could not read the file.');
      }
    };

    reader.onerror = () => {
        alert('Error reading file.');
    };

    reader.readAsText(file);
    input.value = ''; // Reset file input
  }
}