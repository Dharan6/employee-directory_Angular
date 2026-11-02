import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EmployeeList } from './employee-list/employee-list';

@Component({
  imports: [RouterOutlet, EmployeeList],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('employee-directory');
}
