import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeePortalComponent } from './employee-portal.component';

describe('EmployeePortalComponent', () => {
  let component: EmployeePortalComponent;
  let fixture: ComponentFixture<EmployeePortalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmployeePortalComponent]
    });
    fixture = TestBed.createComponent(EmployeePortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
