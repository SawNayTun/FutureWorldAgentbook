
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { WorldIconComponent } from '../icons/world-icon.component';
import { ShieldCheckIconComponent } from '../icons/shield-check-icon.component';
import { CommonModule } from '@angular/common';
import { UserData } from '../../services/data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorldIconComponent, ShieldCheckIconComponent]
})
export class LoginComponent {
  shopName = input<string>();
  loginError = input<string | null>(null);
  isLoggingIn = input(false);
  mode = input.required<'token' | 'pin' | 'set-pin'>();
  currentUser = input<UserData | null>(null);

  loginAttempt = output<string>();
  pinLoginAttempt = output<string>();
  pinSetAttempt = output<string>();
  skipPin = output<void>();
  logout = output<void>();
  inputChange = output<void>();

  loginInput = signal(''); // for token
  pinInput = signal(''); // for pin login & set pin
  pinConfirmInput = signal(''); // for set pin confirmation

  onTokenLogin() {
    this.loginAttempt.emit(this.loginInput());
  }
  
  onPinLogin() {
    this.pinLoginAttempt.emit(this.pinInput());
  }

  onSetPin() {
    if (!this.pinInput()) {
        alert('PIN ရိုက်ထည့်ပါ');
        return;
    }
    if (this.pinInput() !== this.pinConfirmInput()) {
        alert('PIN နံပါတ်များမတူညီပါ!');
        return;
    }
    this.pinSetAttempt.emit(this.pinInput());
  }

  onInputChange() {
    this.inputChange.emit();
  }
}
