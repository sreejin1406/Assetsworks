import { TestBed } from '@angular/core/testing';

import { AuthInterceptorTsService } from './auth.interceptor.ts.service';

describe('AuthInterceptorTsService', () => {
  let service: AuthInterceptorTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthInterceptorTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
