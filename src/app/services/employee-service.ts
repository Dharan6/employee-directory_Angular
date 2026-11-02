import { Service,inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Employee } from '../models/employee.model';
import { environment } from '../../environments/environment';

@Service()
export class EmployeeService {

    private http : HttpClient = inject(HttpClient);
    private apiUrl : string = `${environment.apiUrl}/employees` ;

    private allEmployees = signal<Employee[]>([]) ;
    private searchTerm : string = '';
    private sortColumn : string = '';
    private sortDirection : 'asc' | 'desc' = 'asc';

    private filterDepartment : string = '';
    private filterStatus : string = '';
    private filterLocation : string = '';

     //Pagination properties
    private currentPage: number = 1;
    private pageSize: number = 10;
    private filteredCount: number = 0;

    getEmployees() : Observable<Employee[]> {
        debugger;
        return this.http.get<Employee[]>(this.apiUrl);
    }

    setEmployees(employees : Employee[]):void{
        this.allEmployees.set(employees) ;
    }

    getSortColumn() : string{
        return this.sortColumn;
    }

    getSortDirection() : 'asc' | 'desc'{
       return this.sortDirection;
    }


    getDepartments(): string[]
    {
       const departments : string[] = this.allEmployees().map((emp) => emp.department);
       return [...new Set(departments)].sort();
    }

    getStatuses(): string[]
    {
       const statuses : string[] = this.allEmployees().map((emp) => emp.status);
       return [...new Set(statuses)].sort();
    }

    getLocations(): string[]
    {
       const locations : string[] = this.allEmployees().map((emp) => emp.location);
       return [...new Set(locations)].sort();
    }

    getFilteredAndSortedEmployees(): Employee[]{
  
        let result = [...this.allEmployees()]; // taking copy of the original array.

        if(this.searchTerm.trim())
        {
            const term = this.searchTerm.toLowerCase().trim();

            result = result.filter(
                (employee: Employee) => {
                    return (
                        employee.firstName.toLowerCase().includes(term) ||
                        employee.lastName.toLowerCase().includes(term) ||
                        employee.email.toLowerCase().includes(term) ||
                        employee.department.toLowerCase().includes(term) ||
                        employee.designation.toLowerCase().includes(term) ||
                        employee.location.toLowerCase().includes(term)
                    );
                });
        }

        if(this.filterDepartment){
            result = result.filter((emp) => emp.department === this.filterDepartment);
        }

        if(this.filterStatus){
            result = result.filter((emp) => emp.status === this.filterStatus);
        }

        if(this.filterLocation){
            result = result.filter((emp) => emp.location === this.filterLocation);
        }

        result = this.applySort(result);

        //Store filtered count before pagination
        this.filteredCount = result.length;

        //Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        result = result.slice(startIndex, endIndex);

        return result;
 
    }

    setSearchTerm(term : string) : void {
        this.searchTerm = term;
        this.currentPage = 1;
    }

    setSortColumn(column : string) : void {
        this.sortColumn = column;
    }

    setSort(column : string) : void {

        if(this.sortColumn === column){
            this.sortDirection = this.sortDirection == 'asc' ? 'desc' : 'asc' ;
        }
        else{
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
    }

    setDepartmentFilter(department : string) : void{
        this.filterDepartment = department;
        this.currentPage = 1;
    }

    setStatusFilter(status : string) : void{
        this.filterStatus = status;
        this.currentPage = 1;
    }

    setLocationFilter(location : string) : void{
        this.filterLocation = location;
        this.currentPage = 1;
    }

  private applySort(employees: Employee[]): Employee[]
  {
    if (!this.sortColumn)
    {
      return employees;
    }

    return employees.sort((a: Employee, b: Employee) => {
      const valueA = a[this.sortColumn as keyof Employee];
      const valueB = b[this.sortColumn as keyof Employee];

      let comparison = 0;

      if (typeof valueA === 'string' && typeof valueB === 'string')
      {
        comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
      }
      else if (typeof valueA === 'number' && typeof valueB === 'number')
      {
        comparison = valueA - valueB;
      }

      return this.sortDirection === 'desc'? comparison * -1 : comparison;
    });
  }

  //Pagination getters
  getCurrentPage(): number
  {
    return this.currentPage;
  }

  getPageSize(): number
  {
    return this.pageSize;
  }

  getTotalPages(): number
  {
    return Math.ceil(this.filteredCount / this.pageSize);
  }

  getFilteredCount(): number
  {
    return this.filteredCount;
  }


  //Pagination setters
  setPage(page: number): void
  {
    if (page < 1)
    {
      return;
    }

    if (page > this.getTotalPages())
    {
      return;
    }

    this.currentPage = page;
  }

  nextPage(): void
  {
    if (this.currentPage < this.getTotalPages())
    {
      this.currentPage++;
    }
  }

  previousPage(): void
  {
    if (this.currentPage > 1)
    {
      this.currentPage--;
    }
  }

  deleteEmployee(id : number) : Observable<unknown> {
    debugger;
    this.allEmployees.set(this.allEmployees().filter(emp => emp.id != id));

    const newTotalPages = Math.ceil(this.allEmployees().length / this.pageSize);

    if(this.currentPage > newTotalPages)
    {
      this.currentPage = newTotalPages
    }
    else if(newTotalPages == 0){
      this.currentPage = 1;
    }

    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateEmployee(id: number, updatedData: Partial<Employee>) : Observable<Employee> {

    const index = this.allEmployees().findIndex((emp) => emp.id == id);
    if(index === -1){
      return new Observable<Employee>;
    }

    this.allEmployees()[index] = {...this.allEmployees()[index], ...updatedData};

    return this.http.put<Employee>(`${this.apiUrl}/${id}`,updatedData);

  }

  addEmployee(data : Partial<Employee>) : Observable<Employee> {
    
    const newId = this.allEmployees().reduce((max, emp) => emp.id > max ? emp.id : max , 0 ) + 1 ;

    const newEmployee: Employee = {
      id: newId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      department: data.department || 'Engineering',
      designation: data.designation || '',
      location: data.location || 'New York',
      salary: data.salary || 0,
      joinDate: new Date().toISOString().split('T')[0],
      status: data.status || 'Active',
      managerId: null,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + newId
    }; 

    this.allEmployees().push(newEmployee);

    return this.http.post<Employee>(`${this.apiUrl}`,newEmployee);
  }

  getEmployeesForExport() : Employee[]{
     let result = [...this.allEmployees()]; // taking copy of the original array.

        if(this.searchTerm.trim())
        {
            const term = this.searchTerm.toLowerCase().trim();

            result = result.filter(
                (employee: Employee) => {
                    return (
                        employee.firstName.toLowerCase().includes(term) ||
                        employee.lastName.toLowerCase().includes(term) ||
                        employee.email.toLowerCase().includes(term) ||
                        employee.department.toLowerCase().includes(term) ||
                        employee.designation.toLowerCase().includes(term) ||
                        employee.location.toLowerCase().includes(term)
                    );
                });
        }

        if(this.filterDepartment){
            result = result.filter((emp) => emp.department === this.filterDepartment);
        }

        if(this.filterStatus){
            result = result.filter((emp) => emp.status === this.filterStatus);
        }

        if(this.filterLocation){
            result = result.filter((emp) => emp.location === this.filterLocation);
        }

        result = this.applySort(result);

        //Store filtered count before pagination
        this.filteredCount = result.length;

        return result;
 
  }
}
