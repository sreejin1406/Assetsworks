import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AssetdetailsService } from '../assetdetails.service';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

export type AssetTab = 'rental' | 'repair' | 'replacement';

@Component({
  selector: 'app-assetscreen',
  templateUrl: './assetscreen.component.html',
  styleUrls: ['./assetscreen.component.css']
})
export class AssetscreenComponent implements OnInit {

selectedFile: File | null = null;
selectedFileName = '';


  // ---------- tabs ----------
  activeTab: AssetTab = 'rental';

  // ---------- dropdown data ----------
  models: string[] = [];
  clients: string[] = [];
  statusOptions: string[] = [];
  serialNumbers: string[] = [];
  specifications: string[] = [];

  // ---------- forms ----------
 rentalForm = this.fb.group({
  model: ['', Validators.required],
  serialNumber: ['', Validators.required],
  date: [this.today(), Validators.required],
  clientName: ['', Validators.required],
  status: ['', Validators.required],

  specification: [''],

  dispatchedType: ['', Validators.required],
  courierNumber: [''],
  invoiceNumber: [''],

  reciverDetails: [''],   // editable + dropdown assist
  location: ['', Validators.required]
});

  repairForm: FormGroup = this.fb.group({
    model: ['', Validators.required],
    serialNumber: ['', Validators.required],
    date: [this.today(), Validators.required],
    clientName: ['', Validators.required],
    status: ['Repair', Validators.required],
    issueDescription: ['', Validators.required]
  });

  replacementForm: FormGroup = this.fb.group({
    model: ['', Validators.required],
    oldSerialNumber: ['', Validators.required],
    newSerialNumber: ['', Validators.required],
    date: [this.today(), Validators.required],
    clientName: ['', Validators.required],
    specification: ['']
  });

  // ---------- ui state ----------
  loadingOptions = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';
locations: string[] = [];
receivers: string[] = [];

  constructor(
    private fb: FormBuilder,
    private assetService: AssetdetailsService
  ) { }

  ngOnInit(): void {
    this.loadDropdownData();
  }

  // =====================================================
  // Dropdown data
  // =====================================================

  private loadDropdownData(): void {
    this.loadingOptions = true;
    forkJoin({
      models: this.assetService.getModels(),
      clients: this.assetService.getClients(),
      status: this.assetService.getStatus(),
      serials: this.assetService.getSerialNumbers(),
      specs: this.assetService.getspecifications()
    }).subscribe({
      next: (res: any) => {
        this.models = this.normalizeList(res.models);
        this.clients = this.normalizeList(res.clients);
        this.statusOptions = this.normalizeList(res.status);
        this.serialNumbers = this.normalizeList(res.serials);
        this.specifications = this.normalizeList(res.specs);
        this.loadingOptions = false;
      },
      error: (err: any) => {
        console.error('Failed to load dropdown data', err);
        this.errorMessage = 'Could not load form options. Please refresh.';
        this.loadingOptions = false;
      }
    });
  }

  // API responses can come back as ['Dell Latitude', ...] or [{ name: 'Dell Latitude' }, ...]
  private normalizeList(list: any[]): string[] {
    if (!Array.isArray(list)) { return []; }
    return list.map((item: any) =>
      typeof item === 'string' ? item : (item?.name ?? item?.Name ?? item?.value ?? item?.Value ?? '')
    ).filter(Boolean);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

 onFileSelected(event: any) {

  const file = event.target.files[0];

  if (file) {
    this.selectedFile = file;
    this.selectedFileName = file.name;

    alert(`${file.name} selected successfully`);
  }
}

importExcel() {

  if (!this.selectedFile) {
    alert('Please select excel file');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e: any) => {

    const workbook = XLSX.read(
      e.target.result,
      { type: 'binary' }
    );

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const data =
      XLSX.utils.sheet_to_json(sheet);

    // 👇 ADD HERE
    const formattedData = (data as any[]).map((x: any) => ({

      model: x.Model,

      serialNumber: x.Serial_Number,

      status: x.Status,

      date: this.formatExcelDate(x.Date),

      clientsDetails: x.Clients_Details,

      specification: x.specification,

      dispatchedDetails: x.Dispatched_details,

      reciverDetails: x.Reciver_details,

      location: x.Location

    }));

    console.log(formattedData);

    // 👇 SEND THIS
    this.assetService.importAssets(formattedData)
      .subscribe({
        next: (res: any) => {
          alert(res.message);
        },
        error: (err: any) => {
          console.log(err);
          alert(JSON.stringify(err.error));
        }
      });

  };

  reader.readAsBinaryString(this.selectedFile);
}

formatExcelDate(excelDate: any): string {

  if (!excelDate) {
    return '';
  }

  if (typeof excelDate === 'number') {

    const date = new Date(
      (excelDate - 25569) * 86400 * 1000
    );

    return date.toISOString().split('T')[0];
  }

  return excelDate;
}

  // =====================================================
  // Tabs
  // =====================================================

  switchTab(tab: AssetTab): void {
    if (this.activeTab === tab) { return; }
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
  }

  // =====================================================
  // Submit — Rental / New
  // =====================================================

  onSubmitRental(): void {
    if (this.rentalForm.invalid) {
      this.rentalForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.clearMessages();

const form = this.rentalForm.value;

let dispatchedDetails = '';

if (form.dispatchedType === 'courier') {
  dispatchedDetails = `Courier: ${form.courierNumber}`;
}
else if (form.dispatchedType === 'porter') {
  dispatchedDetails = `Porter Invoice: ${form.invoiceNumber}`;
}
else {
  dispatchedDetails = 'Hand Over';
}

 const payload = {
  model: form.model,
  serialNumber: form.serialNumber,
  status: form.status,
  date: form.date,

  clientsDetails: form.clientName,
  specification: form.specification,

  dispatchedDetails: dispatchedDetails,
  reciverDetails: form.reciverDetails,
  location: form.location
};

    this.assetService.saveAsset(payload).subscribe({
      next: () => {
        this.successMessage = 'Asset added successfully.';
        this.submitting = false;
        this.rentalForm.reset({ model: '', serialNumber: '', date: this.today(), clientName: '', status: '', specification: '' });
      },
      error: (err: any) => {
        console.error('Failed to save asset', err);
        this.errorMessage = 'Could not add the asset. Please try again.';
        this.submitting = false;
      }
    });
  }

  // =====================================================
  // Submit — Repair / Rework
  // =====================================================

  onSubmitRepair(): void {
    if (this.repairForm.invalid) {
      this.repairForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.clearMessages();

    // No dedicated "save repair" endpoint is exposed on AssetdetailsService yet,
    // so this reuses saveAsset() with a category flag. Swap in a real
    // saveRepair() call once the backend has one.
   const payload = {
  model: this.repairForm.value.model,
  serialNumber: this.repairForm.value.serialNumber,
  status: 'Repair',
  date: this.repairForm.value.date,
  clientsDetails: this.repairForm.value.clientName,
  specification: '',
  dispatchedDetails: '',
  reciverDetails: '',
  location: ''
};
    this.assetService.saveAsset(payload).subscribe({
      next: () => {
        this.successMessage = 'Repair request logged successfully.';
        this.submitting = false;
        this.repairForm.reset({ model: '', serialNumber: '', date: this.today(), clientName: '', status: 'Repair', issueDescription: '' });
      },
      error: (err: any) => {
        console.error('Failed to log repair', err);
        this.errorMessage = 'Could not log the repair. Please try again.';
        this.submitting = false;
      }
    });
  }

  // =====================================================
  // Submit — Replacement
  // =====================================================

  onSubmitReplacement(): void {
    if (this.replacementForm.invalid) {
      this.replacementForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.clearMessages();

    const payload = {
  model: this.replacementForm.value.model,
  serialNumber: this.replacementForm.value.newSerialNumber,
  replacedSerialNumber: this.replacementForm.value.oldSerialNumber,
  date: this.replacementForm.value.date,
  details: this.replacementForm.value.clientName,
  specifications: this.replacementForm.value.specification
};

    this.assetService.saveReplacement(payload).subscribe({
      next: () => {
        this.successMessage = 'Replacement recorded successfully.';
        this.submitting = false;
        this.replacementForm.reset({ model: '', oldSerialNumber: '', newSerialNumber: '', date: this.today(), clientName: '', specification: '' });
      },
      error: (err: any) => {
        console.error('Failed to save replacement', err);
        this.errorMessage = 'Could not record the replacement. Please try again.';
        this.submitting = false;
      }
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // =====================================================
  // 3D tilt + mouse-follow glow (form card)
  // =====================================================

  onTiltMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    target.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
    target.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
    target.style.setProperty('--mx', `${x}px`);
    target.style.setProperty('--my', `${y}px`);
  }

  onTiltLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.setProperty('--rx', `0deg`);
    target.style.setProperty('--ry', `0deg`);
  }
}
