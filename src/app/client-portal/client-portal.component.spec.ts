import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientPortalComponent } from './client-portal.component';

describe('ClientPortalComponent', () => {
  let component: ClientPortalComponent;
  let fixture: ComponentFixture<ClientPortalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientPortalComponent]
    });
    fixture = TestBed.createComponent(ClientPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
