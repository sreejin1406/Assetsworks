import { TestBed } from '@angular/core/testing';

import { AssetdetailsService } from './assetdetails.service';

describe('AssetdetailsService', () => {
  let service: AssetdetailsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetdetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
