import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetscreenComponent } from './assetscreen.component';

describe('AssetscreenComponent', () => {
  let component: AssetscreenComponent;
  let fixture: ComponentFixture<AssetscreenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AssetscreenComponent]
    });
    fixture = TestBed.createComponent(AssetscreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
