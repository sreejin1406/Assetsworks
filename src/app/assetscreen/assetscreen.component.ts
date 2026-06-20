 import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AssetdetailsService } from '../assetdetails.service';

@Component({
  selector: 'app-assetscreen',
  templateUrl: './assetscreen.component.html',
  styleUrls: ['./assetscreen.component.css']
})
export class AssetscreenComponent implements OnInit {

  assetForm!: FormGroup;
  replacementForm!: FormGroup;

  activeTab: string = 'rental';

  models: any[] = [];
  clients: any[] = [];
  specifications: any;

  // 🔥 Table
  replacements: any[] = [];
  showTable: boolean = false;

  constructor(
    private fb: FormBuilder,
    private assetService: AssetdetailsService
  ) {}

  ngOnInit(): void {

    this.assetForm = this.fb.group({
      assetName: ['', Validators.required],
      model: ['', Validators.required],
      serialNumber: ['', Validators.required],
      date: ['', Validators.required],
      givenTo: ['', Validators.required],
      status: [''],
      specifications: ['']
    });

    this.replacementForm = this.fb.group({
      assetName: ['', Validators.required],
      model: ['', Validators.required],
      serialNumber: ['', Validators.required],
      replacedSerialNumber: ['', Validators.required],
      date: ['', Validators.required],
      givenTo: ['', Validators.required],
      specifications: ['']
    });

    this.loadDropdowns();
  }

  // 🔹 Load dropdowns
  loadDropdowns() {
    this.assetService.getModels().subscribe(res => this.models = res || []);
    this.assetService.getClients().subscribe(res => this.clients = res || []);
    this.assetService.getspecifications().subscribe(res => this.specifications = res);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // ================= RENTAL =================
  onSubmitRental() {

    if (this.assetForm.invalid) return;

    const data = this.assetForm.value;

    this.assetService.saveAsset(data).subscribe({
      next: () => {
        alert("Asset Saved Successfully");
        this.assetForm.reset();
      },
      error: () => alert("Error saving asset")
    });
  }

  // ================= REPAIR =================
  onSubmitRepair() {

    if (this.assetForm.invalid) return;

    const data = this.assetForm.value;
    data.status = "Repair";

    this.assetService.saveAsset(data).subscribe({
      next: () => {
        alert("Asset sent for Repair");
        this.assetForm.reset();
      },
      error: () => alert("Error updating repair")
    });
  }

  // ================= REPLACEMENT =================
  onSubmitReplacement() {

    if (this.replacementForm.invalid) return;

    const form = this.replacementForm.value;

    const payload = {
      assetName: form.assetName,
      serialNumber: form.serialNumber?.trim(),
      replacedSerialNumber: form.replacedSerialNumber?.trim(),
      model: form.model,
      date: form.date,
      details: form.givenTo,
      specifications: form.specifications
    };

    this.assetService.saveReplacement(payload).subscribe({
      next: () => {
        alert("Replacement Saved");

        this.replacementForm.reset();

        // ✅ refresh table always
        this.getReplacements();
      },
      error: () => {
        alert("Error saving replacement");
      }
    });
  }

  // 🔹 Toggle Table (ONLY ONE METHOD)
  toggleTable() {
    this.showTable = !this.showTable;

    if (this.showTable) {
      this.getReplacements();
    }
  }

  // 🔹 Get table data
  getReplacements() {
    this.assetService.getReplacements().subscribe({
      next: (res: any) => {
        this.replacements = res || [];
      },
      error: () => {
        this.replacements = [];
      }
    });
  }
}