import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { Employee } from '../models/employee.model';
import { EmployeeService } from '../services/employee-service';
import { DecimalPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [DecimalPipe, DatePipe, CurrencyPipe, FormsModule],
  selector: 'app-employee-list',
  styleUrl: './employee-list.css',
  templateUrl: './employee-list.html',
})
export class EmployeeList implements OnInit {

  private employeeService: EmployeeService = inject(EmployeeService);
  private searchSubject : Subject<string> = new Subject<string>();

   employees = signal<Employee[]>([]);
    isLoading = signal(true);
    totalCount =signal<number>(0) ;

    departments : string[] = [];
    statuses : string[] = [];
    locations : string[] = [];

    // for view & delete
    selectedEmployee : Employee | null = null;

    // for editing
    editingEmployeeId : number | null = null;
    editFormData : Partial<Employee> = {};

    //adding new employee
    showAddForm : boolean = false;
    newEmployeeData : Partial<Employee> = {};

  ngOnInit(): void {
  
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((term) => {
      console.log(`term : `, term);
      this.employeeService.setSearchTerm(term) ;
      this.refreshEmployees();
    });

    this.isLoading.set(true);

     this.employeeService.getEmployees().subscribe(
      {
        next: (data : Employee[]) => {
          this.employeeService.setEmployees(data);

          this.departments = this.employeeService.getDepartments();
          this.statuses = this.employeeService.getStatuses();
          this.locations = this.employeeService.getLocations();

          this.refreshEmployees();
          this.totalCount.set(data.length);
          this.isLoading.set(false) ;
        },
        error:(error) =>{
          console.error(`something went wrong : `, error);
          this.isLoading.set(false);
        }
      }
    )
  }

  private refreshEmployees() : void{
    const filteredEmployees = this.employeeService.getFilteredAndSortedEmployees();
    this.employees.set(filteredEmployees);
  }

  get currentPage(): number
  {
    return this.employeeService.getCurrentPage();
  }

  get totalPages(): number
  {
    return this.employeeService.getTotalPages();
  }

  get pageSize(): number
  {
    return this.employeeService.getPageSize();
  }
  
  get filteredCount(): number
  {
    return this.employeeService.getFilteredCount();
  }

  //Pagination methods
  onPageChange(page: number): void
  {
    this.employeeService.setPage(page);
    this.refreshEmployees();
  }

  onNextPage(): void
  {
    this.employeeService.nextPage();
    this.refreshEmployees();
  }

  onPreviousPage(): void
  {
    this.employeeService.previousPage();
    this.refreshEmployees();
  }

  get rangeStart(): number
  {
    debugger;
    if (this.filteredCount === 0)
    {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number
  {
    debugger;
    const end = this.currentPage * this.pageSize;
    return end > this.filteredCount ? this.filteredCount : end;
  }
  
  onSearch(term : string) : void {
    debugger
    this.searchSubject.next(term);  // if we want to push value into subject, we have to use 'next' keyword
  }

   get sortColumn() : string{
    return this.employeeService.getSortColumn();
   }

   get sortDirection() : 'asc' | 'desc' {
    return this.employeeService.getSortDirection();
   }

   onSort(column : string) : void {
    this.employeeService.setSort(column);
    this.refreshEmployees();
   }

   onDepartmentFilter(department : string) : void
   {
    debugger;
    this.employeeService.setDepartmentFilter(department);
    this.refreshEmployees();
   }

   onStatusFilter(status : string) : void
   {
    this.employeeService.setStatusFilter(status);
    this.refreshEmployees();
   }

   onLocationFilter(location : string) : void
   {
    this.employeeService.setLocationFilter(location);
    this.refreshEmployees();
   }

   get pageNumbers() : number[] {
    return [...Array(this.totalPages).keys()].map(i => i+1);
   }

   onCloseDetail() : void {
    this.selectedEmployee = null ;
   }

   onViewEmployee(employee : Employee) : void{
    this.selectedEmployee = employee;
   }

   onDeleteEmployee(employee : Employee) : void{
    const confirmed : boolean = confirm(`Are you sure to delete ${employee.firstName} ${employee.lastName} ?`) ;

    if(confirmed){
      this.employeeService.deleteEmployee(employee.id).subscribe(
      {next : () => {
          this.refreshEmployees();
        },
        error: (error) => {
            console.error(`Something went wrong : `, error);
            
          }
      }
      );
      
    }
   } 

   onEditEmployee(employee : Employee) : void {
    this.editingEmployeeId = employee.id;
    this.editFormData = {...employee};
   }

   onCancelEdit() : void {
      this.editingEmployeeId = null;
      this.editFormData = {};
   }

   onSaveEmployee() : void {

    if(this.editingEmployeeId == null){
      return;
    }
    
      this.employeeService.updateEmployee(this.editingEmployeeId,this.editFormData).subscribe(
        {
          next : () => {
            this.editingEmployeeId = null;
            this.editFormData = {};
            this.refreshEmployees();
          },
          error: (error) => {
            console.error(`Something went wrong : `, error);
            
          }
        }
      );
       
   }

   onToggleAddForm() : void{
    if(!this.showAddForm){
      this.newEmployeeData = {};
    }
    this.showAddForm = !this.showAddForm;
    
   }

   onCancelAdd() : void{
    this.showAddForm = false;
    this.newEmployeeData = {};
   }

   onAddEmployee() : void {
    if(!this.newEmployeeData.firstName || !this.newEmployeeData.lastName || !this.newEmployeeData.email )
    {
      return;
    }

    this.employeeService.addEmployee(this.newEmployeeData).subscribe(
      {
        next : () => {
          this.showAddForm = false;
          this.newEmployeeData = {};
          this.refreshEmployees()
        },
        error: (error) => {
            console.error(`Something went wrong : `, error);           
          }
      }
    );
    
   }

   onExportToCsv(): void
  {
    const employees = this.employeeService.getEmployeesForExport();

    if (employees.length === 0)
    {
      alert('No employees to export');
      return;
    }

    //CSV
    //e.g: value1,value2,value3

    //Define headers
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Designation', 'Location', 'Salary', 'Join Date', 'Status'];

    //Helper function to escape CSV values
    const escapeCsvValue = (value: any): string => {
      const stringValue = String(value ?? '');
      //Wrap in quotes and escape existing quotes
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    //Convert employees to CSV rows
    const rows = employees.map(emp => {
      return [
        escapeCsvValue(emp.id),
        escapeCsvValue(emp.firstName),
        escapeCsvValue(emp.lastName),
        escapeCsvValue(emp.email),
        escapeCsvValue(emp.phone),
        escapeCsvValue(emp.department),
        escapeCsvValue(emp.designation),
        escapeCsvValue(emp.location),
        escapeCsvValue(emp.salary),
        escapeCsvValue(emp.joinDate),
        escapeCsvValue(emp.status)
      ].join(', ')
    });

    //Unexpected CSV: value1,"va,lu,e2",value3

    //Combine headers and rows
    const csvContent = headers.join(', ') + '\n' + rows.join('\n');

    //Create blob and trigger download
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'employees.csv';
    anchor.click();

    URL.revokeObjectURL(url);
  }

}
