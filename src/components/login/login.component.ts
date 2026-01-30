import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { WorldIconComponent } from '../icons/world-icon.component';
import { CopyIconComponent } from '../icons/copy-icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorldIconComponent, CopyIconComponent]
})
export class LoginComponent {
  shopName = input.required<string>();
  loginError = input<string | null>(null);
  isLoggingIn = input(false);
  loginAttempt = output<string>();
  inputChange = output<void>();

  loginInput = signal('');

  onLogin() {
    this.loginAttempt.emit(this.loginInput());
  }

  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.loginInput.set(value);
    this.inputChange.emit();
  }
}