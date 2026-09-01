import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PrayerEditorService,
  JamaahTemplate,
  JamaahTemplateUpsert,
  JamaahTemplateType,
  JamaahTemplatePrayer,
  GenerateFromTemplateResult,
} from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';

const DAY_LABELS = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
];

const TYPE_OPTIONS: { value: JamaahTemplateType; label: string; icon: string }[] = [
  { value: 'Winter', label: 'Winter', icon: '❄' },
  { value: 'Spring', label: 'Spring', icon: '🌱' },
  { value: 'Summer', label: 'Summer', icon: '☀' },
  { value: 'Autumn', label: 'Autumn', icon: '🍂' },
  { value: 'Ramadan', label: 'Ramadan', icon: '🌙' },
  { value: 'Custom', label: 'Custom', icon: '📋' },
];

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

function defaultPrayers(): JamaahTemplatePrayer[] {
  const defaults: Record<string, [string, string]> = {
    Fajr: ['05:30:00', '05:45:00'],
    Dhuhr: ['12:30:00', '13:00:00'],
    Asr: ['15:30:00', '16:00:00'],
    Maghrib: ['18:00:00', '18:10:00'],
    Isha: ['19:30:00', '20:00:00'],
  };
  return PRAYER_NAMES.map((name, i) => ({
    prayerName: name,
    startTime: defaults[name][0],
    jamaatTime: defaults[name][1],
    sortOrder: i,
  }));
}

function emptyForm(): JamaahTemplateUpsert {
  return {
    name: '',
    templateType: 'Winter',
    effectiveFrom: '',
    effectiveTo: '',
    priority: 1,
    isActive: true,
    isDefault: false,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    specificDates: [],
    excludedDates: [],
    prayers: defaultPrayers(),
  };
}

@Component({
  selector: 'app-prayer-editor-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="ped">
      <header class="ped-top">
        <div>
          <p class="ped-crumb">Timetables <span>/</span> Jamaah templates</p>
          <h1 class="ped-title">Jamaah templates</h1>
          <p class="ped-sub">Create and manage jamaah time templates for different seasons and occasions.</p>
        </div>
        <button type="button" class="ped-btn" (click)="startNew()">+ New template</button>
      </header>

      <div class="ped-warn" *ngIf="warnings().length">
        <p class="ped-warn__title">Overlap warnings</p>
        <ul>
          <li *ngFor="let w of warnings()">{{ w }}</li>
        </ul>
      </div>

      <section class="ped-card" *ngIf="showForm()">
        <h2 class="ped-card__title">{{ editingId() ? 'Edit template' : 'Create new template' }}</h2>

        <div class="meta-row">
          <label class="field field--grow">Template name
            <input class="ped-input" type="text" [(ngModel)]="form.name" placeholder="e.g. Winter Timetable" />
          </label>
          <label class="field field--type">Type
            <select class="ped-input" [(ngModel)]="form.templateType" (ngModelChange)="onTypeChange($event)">
              <option *ngFor="let t of typeOptions" [ngValue]="t.value">{{ t.label }}</option>
            </select>
          </label>
          <label class="field field--date">From
            <input class="ped-input" type="date" [(ngModel)]="form.effectiveFrom" />
          </label>
          <label class="field field--date">To
            <input class="ped-input" type="date" [(ngModel)]="form.effectiveTo" />
          </label>
          <label class="field field--pri">Priority
            <input class="ped-input" type="number" min="0" max="9999" [(ngModel)]="form.priority" />
            <span class="hint">Lower number = higher priority (0 is highest)</span>
          </label>
          <div class="field field--status">Status
            <button
              type="button"
              class="toggle"
              [class.toggle--on]="form.isActive"
              role="switch"
              [attr.aria-checked]="form.isActive"
              (click)="form.isActive = !form.isActive"
            >
              <span class="toggle__knob"></span>
              <span class="toggle__label">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
            </button>
          </div>
        </div>

        <div class="section-block">
          <h3 class="section-title">Jamaah times</h3>
          <div class="times-grid">
            <div class="prayer-pair" *ngFor="let p of form.prayers; let i = index">
              <label class="field">{{ p.prayerName }} Start
                <input class="ped-input" type="time" [ngModel]="toInput(p.startTime)" (ngModelChange)="setPrayerTime(i, 'startTime', $event)" />
              </label>
              <label class="field">{{ p.prayerName }} Jamaah
                <input class="ped-input" type="time" [ngModel]="toInput(p.jamaatTime)" (ngModelChange)="setPrayerTime(i, 'jamaatTime', $event)" />
              </label>
            </div>
          </div>
        </div>

        <div class="section-block">
          <h3 class="section-title">Apply on days</h3>
          <div class="day-pills">
            <button
              type="button"
              class="day-pill"
              *ngFor="let d of dayLabels"
              [class.day-pill--on]="hasDay(d.value)"
              (click)="toggleDayClick(d.value)"
            >{{ d.label }}</button>
          </div>
        </div>

        <div class="dates-row">
          <label class="field field--grow">Apply on specific dates (optional)
            <div class="date-add">
              <input class="ped-input" type="date" [(ngModel)]="specificDatePick" />
              <button type="button" class="ped-btn ped-btn--ghost ped-btn--sm" (click)="addSpecificDate()">Add</button>
            </div>
            <div class="chip-row" *ngIf="specificDateList.length">
              <span class="chip" *ngFor="let d of specificDateList">
                {{ d }}
                <button type="button" class="chip__x" (click)="removeSpecificDate(d)" aria-label="Remove">×</button>
              </span>
            </div>
          </label>
          <label class="field field--grow">Exclude dates (optional)
            <div class="date-add">
              <input class="ped-input" type="date" [(ngModel)]="excludedDatePick" />
              <button type="button" class="ped-btn ped-btn--ghost ped-btn--sm" (click)="addExcludedDate()">Add</button>
            </div>
            <div class="chip-row" *ngIf="excludedDateList.length">
              <span class="chip" *ngFor="let d of excludedDateList">
                {{ d }}
                <button type="button" class="chip__x" (click)="removeExcludedDate(d)" aria-label="Remove">×</button>
              </span>
            </div>
          </label>
        </div>

        <div class="checks">
          <label class="check">
            <input type="checkbox" [checked]="fridaysOnly" (change)="toggleFridaysOnly($event)" />
            Apply only on Fridays
          </label>
          <label class="check">
            <input type="checkbox" [(ngModel)]="form.isDefault" />
            Make this template the default
          </label>
        </div>

        <div class="actions">
          <button type="button" class="ped-btn" [disabled]="busy()" (click)="save()">Save template</button>
          <button type="button" class="ped-btn ped-btn--ghost" (click)="cancelForm()">Cancel</button>
        </div>
      </section>

      <section class="ped-card ped-card--muted" *ngIf="templates().length">
        <button type="button" class="gen-toggle" (click)="showGenerate.set(!showGenerate())">
          <span>{{ showGenerate() ? '▾' : '▸' }} Generate daily rows from a template</span>
        </button>
        <div *ngIf="showGenerate()" class="gen-body">
          <div class="meta-row">
            <label class="field field--grow">Template
              <select class="ped-input" [(ngModel)]="generateTemplateId">
                <option [ngValue]="0" disabled>Select template…</option>
                <option *ngFor="let t of templates()" [ngValue]="t.id">
                  {{ t.name }}{{ t.isActive ? '' : ' (inactive)' }}
                </option>
              </select>
            </label>
            <label class="field field--date">From
              <input class="ped-input" type="date" [(ngModel)]="generateFrom" />
            </label>
            <label class="field field--date">To
              <input class="ped-input" type="date" [(ngModel)]="generateTo" />
            </label>
          </div>
          <div class="checks">
            <label class="check"><input type="checkbox" [(ngModel)]="skipExisting" /> Skip existing records</label>
            <label class="check"><input type="checkbox" [(ngModel)]="overwritePublished" [disabled]="skipExisting" /> Overwrite published days</label>
            <label class="check"><input type="checkbox" [(ngModel)]="publishGenerated" /> Publish generated days</label>
          </div>
          <div class="actions">
            <button type="button" class="ped-btn ped-btn--ghost" [disabled]="busy() || !generateTemplateId" (click)="previewGenerate()">Preview</button>
            <button type="button" class="ped-btn" [disabled]="busy() || !generateTemplateId" (click)="generate()">Generate</button>
          </div>
          <div class="preview" *ngIf="previewResult()">
            <p class="preview__summary">{{ previewResult()!.message }}</p>
            <div class="preview__table" *ngIf="previewResult()!.rows?.length">
              <div class="preview__row preview__row--head">
                <span>Date</span><span>Action</span><span>Reason</span>
              </div>
              <div class="preview__row" *ngFor="let r of previewResult()!.rows!.slice(0, 40)">
                <span>{{ r.date }}</span>
                <span class="act" [attr.data-act]="r.action">{{ r.action }}</span>
                <span class="muted">{{ r.reason || '—' }}</span>
              </div>
              <p class="muted" *ngIf="(previewResult()!.rows?.length || 0) > 40">
                Showing first 40 of {{ previewResult()!.rows!.length }} rows…
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="ped-card">
        <div class="table-head-row">
          <h2 class="ped-card__title ped-card__title--flush">Saved templates</h2>
          <p class="muted">{{ templates().length }} template{{ templates().length === 1 ? '' : 's' }}</p>
        </div>

        <div class="table-wrap" *ngIf="templates().length">
          <table class="tpl-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Type</th>
                <th>Effective period</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Days</th>
                <th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of templates()">
                <td>
                  <div class="tpl-name">
                    <span class="tpl-icon" [attr.data-type]="typeName(t)">{{ typeIcon(t) }}</span>
                    <div>
                      <strong>{{ t.name }}</strong>
                      <span class="tpl-sub" *ngIf="seasonSubtitle(t) as sub">{{ sub }}</span>
                      <span class="badge badge--default" *ngIf="t.isDefault">Default</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="type-badge" [attr.data-type]="typeName(t)">{{ typeName(t) }}</span>
                </td>
                <td class="mono">{{ dateRange(t) }}</td>
                <td class="pri-cell">{{ t.priority }}</td>
                <td>
                  <button
                    type="button"
                    class="status-badge status-badge--btn"
                    [class.status-badge--off]="!t.isActive"
                    [disabled]="busy()"
                    [title]="t.isActive ? 'Click to deactivate' : 'Click to activate'"
                    (click)="toggleActive(t)"
                  >
                    {{ t.isActive ? 'Active' : 'Inactive' }}
                  </button>
                </td>
                <td>
                  <div class="day-dots" aria-label="Days of week">
                    <span
                      *ngFor="let d of dayLabels"
                      class="day-dot"
                      [class.day-dot--on]="hasTemplateDay(t, d.value)"
                      [title]="d.label"
                    >{{ d.short }}</span>
                  </div>
                </td>
                <td class="actions-cell">
                  <button type="button" class="icon-btn" title="Edit" (click)="edit(t)" aria-label="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button type="button" class="icon-btn" title="Duplicate" (click)="duplicate(t)" aria-label="Duplicate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button type="button" class="icon-btn icon-btn--danger" title="Delete" (click)="remove(t)" aria-label="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p *ngIf="!templates().length" class="muted empty-msg">No templates yet. Create one above.</p>
      </section>

      <div class="ped-tip">
        <span class="ped-tip__icon" aria-hidden="true">ℹ</span>
        <p>
          Templates are applied based on date range and priority. The template with the
          <strong>lowest priority number</strong> (including 0) will be used when multiple templates match.
          Generate also respects effective dates, specific dates, and excluded dates.
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Segoe UI', Inter, system-ui, sans-serif; }
    .ped {
      --ped-ink: #0f172a; --ped-muted: #64748b; --ped-border: #e2e8f0;
      --ped-primary: #0f4c3a; --ped-primary-hover: #0a3d2e;
      --ped-surface: #f8fafc;
      display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 2rem; color: var(--ped-ink);
    }
    .ped-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .ped-crumb {
      margin: 0; font-size: 0.75rem; font-weight: 600; color: var(--ped-muted); letter-spacing: 0.01em;
    }
    .ped-crumb span { margin: 0 0.35rem; color: #94a3b8; }
    .ped-title {
      margin: 0.4rem 0 0; font-size: clamp(1.65rem, 3vw, 1.95rem); font-weight: 800;
      letter-spacing: -0.03em; color: var(--ped-ink); line-height: 1.15;
    }
    .ped-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--ped-muted); max-width: 38rem; }
    .ped-card {
      background: #fff; border: 1px solid var(--ped-border); border-radius: 14px;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05); padding: 1.35rem 1.4rem;
    }
    .ped-card--muted { background: var(--ped-surface); padding: 0.85rem 1.15rem; }
    .ped-card__title { margin: 0 0 1.1rem; font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em; }
    .ped-card__title--flush { margin-bottom: 0; }
    .ped-warn {
      border: 1px solid #fcd34d; background: #fffbeb; border-radius: 12px; padding: 0.85rem 1rem; color: #92400e;
    }
    .ped-warn__title { margin: 0 0 0.35rem; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .ped-warn ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }

    .meta-row {
      display: grid;
      grid-template-columns: minmax(10rem, 1.4fr) minmax(7rem, 0.7fr) minmax(8rem, 0.85fr) minmax(8rem, 0.85fr) minmax(6rem, 0.55fr) auto;
      gap: 0.75rem 0.85rem; align-items: start;
    }
    @media (max-width: 960px) {
      .meta-row { grid-template-columns: 1fr 1fr; }
      .field--grow { grid-column: 1 / -1; }
    }
    .field {
      display: flex; flex-direction: column; gap: 0.35rem;
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ped-muted);
    }
    .field--grow { min-width: 0; }
    .hint {
      font-size: 0.65rem; font-weight: 600; letter-spacing: 0; text-transform: none; color: #94a3b8; margin-top: 0.15rem;
    }
    .ped-input {
      width: 100%; padding: 0.6rem 0.75rem; border-radius: 10px; border: 1px solid var(--ped-border);
      background: #fff; color: var(--ped-ink); font-size: 0.875rem; font-family: inherit; outline: none;
      box-sizing: border-box; text-transform: none; letter-spacing: 0; font-weight: 500;
    }
    .ped-input:focus { border-color: var(--ped-primary); box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12); }

    .toggle {
      display: inline-flex; align-items: center; gap: 0.55rem; margin-top: 0.15rem;
      padding: 0.2rem; border: none; background: transparent; cursor: pointer; font-family: inherit;
    }
    .toggle__knob {
      position: relative; width: 2.5rem; height: 1.35rem; border-radius: 999px;
      background: #cbd5e1; transition: background 0.15s ease; flex-shrink: 0;
    }
    .toggle__knob::after {
      content: ''; position: absolute; top: 2px; left: 2px; width: 1.1rem; height: 1.1rem;
      border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform 0.15s ease;
    }
    .toggle--on .toggle__knob { background: var(--ped-primary); }
    .toggle--on .toggle__knob::after { transform: translateX(1.1rem); }
    .toggle__label {
      font-size: 0.8rem; font-weight: 700; color: #334155; letter-spacing: 0; text-transform: none;
    }

    .section-block { margin-top: 1.25rem; }
    .section-title {
      margin: 0 0 0.65rem; font-size: 0.8rem; font-weight: 800; color: var(--ped-ink); letter-spacing: -0.01em;
    }
    .times-grid {
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.65rem;
    }
    @media (max-width: 900px) {
      .times-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .prayer-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }

    .day-pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .day-pill {
      min-width: 3.1rem; padding: 0.45rem 0.7rem; border-radius: 999px;
      border: 1px solid var(--ped-border); background: #fff; color: #64748b;
      font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.12s ease;
    }
    .day-pill:hover { border-color: #94a3b8; }
    .day-pill--on {
      background: var(--ped-primary); border-color: var(--ped-primary); color: #fff;
    }

    .dates-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-top: 1.1rem;
    }
    @media (max-width: 700px) { .dates-row { grid-template-columns: 1fr; } }
    .date-add { display: flex; gap: 0.45rem; align-items: center; }
    .date-add .ped-input { flex: 1; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.45rem; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem;
      border-radius: 999px; background: #f1f5f9; font-size: 0.72rem; font-weight: 600;
      color: #334155; letter-spacing: 0; text-transform: none;
    }
    .chip__x {
      border: none; background: transparent; color: #64748b; cursor: pointer;
      font-size: 0.95rem; line-height: 1; padding: 0 0.1rem;
    }

    .checks { display: flex; flex-wrap: wrap; gap: 1.25rem; margin: 1rem 0 0.25rem; }
    .check {
      display: flex; align-items: center; gap: 0.45rem; font-size: 0.85rem; color: #334155;
      font-weight: 600; letter-spacing: 0; text-transform: none; cursor: pointer;
    }
    .check input { accent-color: var(--ped-primary); width: 1rem; height: 1rem; }

    .actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 1.1rem; }
    .ped-btn {
      display: inline-flex; align-items: center; justify-content: center; padding: 0.65rem 1.2rem;
      border-radius: 999px; background: var(--ped-primary); color: #fff; font-size: 0.8125rem; font-weight: 700;
      border: none; cursor: pointer; font-family: inherit;
    }
    .ped-btn:hover:not(:disabled) { background: var(--ped-primary-hover); }
    .ped-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .ped-btn--ghost { background: #fff; color: var(--ped-ink); border: 1px solid var(--ped-border); }
    .ped-btn--ghost:hover:not(:disabled) { background: #f8fafc; }
    .ped-btn--sm { padding: 0.45rem 0.8rem; font-size: 0.75rem; }

    .gen-toggle {
      width: 100%; border: none; background: transparent; text-align: left; cursor: pointer;
      font-size: 0.85rem; font-weight: 700; color: #334155; font-family: inherit; padding: 0.15rem 0;
    }
    .gen-body { margin-top: 0.85rem; }
    .preview {
      margin-top: 1rem; padding: 0.85rem; border-radius: 12px; border: 1px solid var(--ped-border); background: #f8fafc;
    }
    .preview__summary { margin: 0 0 0.65rem; font-size: 0.85rem; font-weight: 700; color: #334155; }
    .preview__table { max-height: 16rem; overflow: auto; }
    .preview__row {
      display: grid; grid-template-columns: 7.5rem 5rem 1fr; gap: 0.5rem;
      padding: 0.35rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.78rem;
    }
    .preview__row--head { font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ped-muted); font-size: 0.65rem; }
    .act { font-weight: 700; text-transform: uppercase; font-size: 0.68rem; }
    .act[data-act="create"] { color: #166534; }
    .act[data-act="update"] { color: #1d4ed8; }
    .act[data-act="skip"] { color: #64748b; }

    .table-head-row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; margin-bottom: 0.85rem; }
    .table-wrap { overflow: auto; border: 1px solid var(--ped-border); border-radius: 12px; }
    .tpl-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 760px; }
    .tpl-table th, .tpl-table td {
      padding: 0.85rem 0.9rem; border-bottom: 1px solid var(--ped-border); text-align: left; vertical-align: middle;
    }
    .tpl-table th {
      font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--ped-muted); background: var(--ped-surface);
    }
    .th-actions { text-align: right; }
    .tpl-table tr:last-child td { border-bottom: none; }
    .tpl-table tbody tr:hover td { background: #fafbfc; }

    .tpl-name { display: flex; align-items: flex-start; gap: 0.65rem; }
    .tpl-name strong { display: block; font-weight: 700; color: var(--ped-ink); }
    .tpl-sub { display: block; font-size: 0.75rem; color: var(--ped-muted); margin-top: 0.15rem; font-weight: 500; }
    .tpl-icon {
      width: 2.1rem; height: 2.1rem; border-radius: 10px; display: inline-flex; align-items: center;
      justify-content: center; font-size: 1rem; background: #f1f5f9; flex-shrink: 0;
    }
    .tpl-icon[data-type="Winter"] { background: #eff6ff; }
    .tpl-icon[data-type="Summer"] { background: #fffbeb; }
    .tpl-icon[data-type="Spring"] { background: #ecfdf5; }
    .tpl-icon[data-type="Autumn"] { background: #fff7ed; }
    .tpl-icon[data-type="Ramadan"] { background: #f5f3ff; }

    .type-badge {
      display: inline-flex; padding: 0.2rem 0.55rem; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569;
    }
    .type-badge[data-type="Winter"] { background: #dbeafe; color: #1d4ed8; }
    .type-badge[data-type="Summer"] { background: #fef3c7; color: #b45309; }
    .type-badge[data-type="Spring"] { background: #d1fae5; color: #047857; }
    .type-badge[data-type="Autumn"] { background: #ffedd5; color: #c2410c; }
    .type-badge[data-type="Ramadan"] { background: #ede9fe; color: #6d28d9; }
    .type-badge[data-type="Custom"] { background: #e2e8f0; color: #475569; }

    .mono { font-variant-numeric: tabular-nums; font-size: 0.8rem; color: #334155; white-space: nowrap; }
    .pri-cell { font-weight: 700; font-variant-numeric: tabular-nums; }

    .status-badge {
      display: inline-flex; padding: 0.2rem 0.55rem; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; background: #dcfce7; color: #166534;
    }
    .status-badge--off { background: #f1f5f9; color: #64748b; }
    .status-badge--btn {
      border: none; cursor: pointer; font-family: inherit; transition: opacity 0.12s ease;
    }
    .status-badge--btn:hover:not(:disabled) { opacity: 0.85; box-shadow: inset 0 0 0 1px currentColor; }
    .status-badge--btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .badge {
      display: inline-block; margin-left: 0.35rem; font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
      padding: 0.12rem 0.4rem; border-radius: 999px; vertical-align: middle;
    }
    .badge--default { background: rgba(15,76,58,0.12); color: var(--ped-primary); }

    .day-dots { display: flex; gap: 0.2rem; }
    .day-dot {
      width: 1.35rem; height: 1.35rem; border-radius: 50%; display: inline-flex; align-items: center;
      justify-content: center; font-size: 0.58rem; font-weight: 800; background: #f1f5f9; color: #94a3b8;
    }
    .day-dot--on { background: var(--ped-primary); color: #fff; }

    .actions-cell { display: flex; justify-content: flex-end; gap: 0.2rem; }
    .icon-btn {
      width: 2rem; height: 2rem; border-radius: 8px; border: none; background: transparent;
      color: #64748b; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: #f1f5f9; color: var(--ped-ink); }
    .icon-btn--danger:hover { background: #fef2f2; color: #b91c1c; }

    .muted { color: var(--ped-muted); font-size: 0.85rem; margin: 0; }
    .empty-msg { padding: 0.5rem 0; }

    .ped-tip {
      display: flex; gap: 0.75rem; align-items: flex-start;
      padding: 0.9rem 1.1rem; border-radius: 12px;
      background: rgba(15, 76, 58, 0.07); border: 1px solid rgba(15, 76, 58, 0.14);
      color: #14532d; font-size: 0.85rem; line-height: 1.45;
    }
    .ped-tip p { margin: 0; }
    .ped-tip__icon {
      width: 1.35rem; height: 1.35rem; border-radius: 50%; background: var(--ped-primary); color: #fff;
      display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;
      flex-shrink: 0; margin-top: 0.05rem;
    }
  `],
})
export class PrayerEditorTemplatesComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);

  templates = signal<JamaahTemplate[]>([]);
  editingId = signal<number | null>(null);
  showForm = signal(true);
  showGenerate = signal(false);
  busy = signal(false);
  warnings = signal<string[]>([]);
  form: JamaahTemplateUpsert = emptyForm();
  specificDateList: string[] = [];
  excludedDateList: string[] = [];
  specificDatePick = '';
  excludedDatePick = '';
  fridaysOnly = false;
  dayLabels = DAY_LABELS;
  typeOptions = TYPE_OPTIONS;

  generateTemplateId = 0;
  generateFrom = new Date().toISOString().slice(0, 10);
  generateTo = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  overwritePublished = false;
  skipExisting = false;
  publishGenerated = true;
  previewResult = signal<GenerateFromTemplateResult | null>(null);

  private mosqueId = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.load();
    });
  }

  toInput(t: string): string {
    return (t || '').slice(0, 5);
  }

  toFull(v: string): string {
    return v?.length === 5 ? v + ':00' : v;
  }

  setPrayerTime(index: number, field: 'startTime' | 'jamaatTime', val: string): void {
    if (!val) return;
    this.form.prayers[index] = {
      ...this.form.prayers[index],
      [field]: this.toFull(val),
    };
  }

  hasDay(day: number): boolean {
    return this.form.daysOfWeek.includes(day);
  }

  hasTemplateDay(t: JamaahTemplate, day: number): boolean {
    const days = t.daysOfWeek?.length ? t.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(day);
  }

  toggleDayClick(day: number): void {
    if (this.hasDay(day)) {
      this.form.daysOfWeek = this.form.daysOfWeek.filter(d => d !== day);
    } else {
      this.form.daysOfWeek = [...this.form.daysOfWeek, day].sort();
    }
    this.fridaysOnly = this.form.daysOfWeek.length === 1 && this.form.daysOfWeek[0] === 5;
  }

  toggleFridaysOnly(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.fridaysOnly = checked;
    if (checked) this.form.daysOfWeek = [5];
    else if (this.form.daysOfWeek.length === 1 && this.form.daysOfWeek[0] === 5) {
      this.form.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    }
  }

  addSpecificDate(): void {
    if (!this.specificDatePick) return;
    if (!this.specificDateList.includes(this.specificDatePick)) {
      this.specificDateList = [...this.specificDateList, this.specificDatePick].sort();
    }
    this.specificDatePick = '';
  }

  removeSpecificDate(d: string): void {
    this.specificDateList = this.specificDateList.filter(x => x !== d);
  }

  addExcludedDate(): void {
    if (!this.excludedDatePick) return;
    if (!this.excludedDateList.includes(this.excludedDatePick)) {
      this.excludedDateList = [...this.excludedDateList, this.excludedDatePick].sort();
    }
    this.excludedDatePick = '';
  }

  removeExcludedDate(d: string): void {
    this.excludedDateList = this.excludedDateList.filter(x => x !== d);
  }

  onTypeChange(type: JamaahTemplateType): void {
    if (type === 'Ramadan' && this.form.priority >= 100) this.form.priority = 0;
  }

  typeIcon(t: JamaahTemplate): string {
    const name = this.typeName(t);
    return TYPE_OPTIONS.find(o => o.value === name)?.icon ?? '📋';
  }

  typeName(t: JamaahTemplate): string {
    if (typeof t.templateType === 'string') return t.templateType;
    if (t.templateTypeName) return t.templateTypeName;
    const map = ['Custom', 'Winter', 'Spring', 'Summer', 'Autumn', 'Ramadan'];
    return map[Number(t.templateType)] ?? 'Custom';
  }

  dateRange(t: JamaahTemplate): string {
    const from = this.formatDisplayDate(t.effectiveFrom);
    const to = this.formatDisplayDate(t.effectiveTo);
    return `${from} – ${to}`;
  }

  seasonSubtitle(t: JamaahTemplate): string | null {
    if (!t.effectiveFrom && !t.effectiveTo) return null;
    const from = this.shortMonthDay(t.effectiveFrom);
    const to = this.shortMonthDay(t.effectiveTo);
    if (!from && !to) return null;
    return `${from || '…'} – ${to || '…'}`;
  }

  private formatDisplayDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso.slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private shortMonthDay(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso.slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  load(): void {
    this.editor.getTemplates(this.mosqueId).subscribe({
      next: list => {
        this.templates.set(list ?? []);
        if (!this.generateTemplateId && list?.length) this.generateTemplateId = list[0].id;
      },
      error: () => this.templates.set([]),
    });
  }

  startNew(): void {
    this.editingId.set(null);
    this.form = emptyForm();
    this.specificDateList = [];
    this.excludedDateList = [];
    this.fridaysOnly = false;
    this.warnings.set([]);
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.editingId.set(null);
    this.form = emptyForm();
    this.specificDateList = [];
    this.excludedDateList = [];
    this.fridaysOnly = false;
    this.showForm.set(false);
    this.warnings.set([]);
  }

  edit(t: JamaahTemplate): void {
    this.editingId.set(t.id);
    const prayers = (t.prayers?.length ? t.prayers : defaultPrayers()).map((p, i) => ({
      prayerName: p.prayerName,
      startTime: this.toFull(this.toInput(p.startTime)),
      jamaatTime: this.toFull(this.toInput(p.jamaatTime)),
      sortOrder: p.sortOrder ?? i,
    }));
    const byName = new Map(prayers.map(p => [p.prayerName, p]));
    const days = t.daysOfWeek?.length ? [...t.daysOfWeek] : [0, 1, 2, 3, 4, 5, 6];
    this.form = {
      name: t.name,
      templateType: this.typeName(t) as JamaahTemplateType,
      effectiveFrom: t.effectiveFrom?.slice(0, 10) || '',
      effectiveTo: t.effectiveTo?.slice(0, 10) || '',
      priority: t.priority ?? 1,
      isActive: t.isActive,
      isDefault: t.isDefault,
      daysOfWeek: days,
      specificDates: t.specificDates ?? [],
      excludedDates: t.excludedDates ?? [],
      prayers: PRAYER_NAMES.map((name, i) => byName.get(name) ?? {
        prayerName: name,
        startTime: defaultPrayers()[i].startTime,
        jamaatTime: defaultPrayers()[i].jamaatTime,
        sortOrder: i,
      }),
    };
    this.specificDateList = [...(t.specificDates ?? [])];
    this.excludedDateList = [...(t.excludedDates ?? [])];
    this.fridaysOnly = days.length === 1 && days[0] === 5;
    this.warnings.set([]);
    this.showForm.set(true);
  }

  private buildPayload(): JamaahTemplateUpsert {
    return {
      ...this.form,
      name: this.form.name.trim(),
      effectiveFrom: this.form.effectiveFrom || null,
      effectiveTo: this.form.effectiveTo || null,
      specificDates: [...this.specificDateList],
      excludedDates: [...this.excludedDateList],
      prayers: this.form.prayers.map((p, i) => ({
        ...p,
        startTime: this.toFull(this.toInput(p.startTime)),
        jamaatTime: this.toFull(this.toInput(p.jamaatTime)),
        sortOrder: i,
      })),
    };
  }

  save(): void {
    const payload = this.buildPayload();
    if (!payload.name) {
      this.snack.open('Template name is required.', 'OK', { duration: 3000 });
      return;
    }
    if (!payload.daysOfWeek.length) {
      this.snack.open('Select at least one day of week.', 'OK', { duration: 3000 });
      return;
    }
    this.busy.set(true);
    const id = this.editingId();
    const req = id
      ? this.editor.updateTemplate(this.mosqueId, id, payload)
      : this.editor.createTemplate(this.mosqueId, payload);

    req.subscribe({
      next: (res) => {
        this.busy.set(false);
        this.warnings.set(res.warnings ?? []);
        this.snack.open(id ? 'Template updated.' : 'Template created.', 'OK', { duration: 3000 });
        if (res.warnings?.length) {
          this.snack.open(res.warnings[0], 'OK', { duration: 5000 });
        }
        this.editingId.set(null);
        this.form = emptyForm();
        this.specificDateList = [];
        this.excludedDateList = [];
        this.fridaysOnly = false;
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Could not save template.', 'OK', { duration: 4000 });
      },
    });
  }

  duplicate(t: JamaahTemplate): void {
    this.busy.set(true);
    this.editor.duplicateTemplate(this.mosqueId, t.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
        this.snack.open('Template duplicated.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busy.set(false);
        this.snack.open('Could not duplicate template.', 'OK', { duration: 3000 });
      },
    });
  }

  toggleActive(t: JamaahTemplate): void {
    const next = !t.isActive;
    this.busy.set(true);
    this.editor.setTemplateActive(this.mosqueId, t.id, next).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.templates.update(list =>
          list.map(x => x.id === t.id ? { ...x, isActive: updated.isActive } : x),
        );
        this.snack.open(next ? 'Template activated.' : 'Template deactivated.', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busy.set(false);
        this.snack.open('Could not update template status.', 'OK', { duration: 3000 });
      },
    });
  }

  remove(t: JamaahTemplate): void {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    this.editor.deleteTemplate(this.mosqueId, t.id).subscribe({
      next: () => {
        if (this.editingId() === t.id) this.cancelForm();
        this.templates.update(list => list.filter(x => x.id !== t.id));
        this.snack.open('Template deleted.', 'OK', { duration: 2500 });
      },
      error: () => this.snack.open('Could not delete template.', 'OK', { duration: 3000 }),
    });
  }

  previewGenerate(): void {
    this.runGenerate(true);
  }

  generate(): void {
    if (this.overwritePublished && !this.skipExisting && !confirm('Overwrite existing published days in this range?')) return;
    this.runGenerate(false);
  }

  private runGenerate(preview: boolean): void {
    if (!this.generateTemplateId || !this.generateFrom || !this.generateTo) {
      this.snack.open('Select template and date range.', 'OK', { duration: 3000 });
      return;
    }

    this.busy.set(true);
    if (preview) this.previewResult.set(null);

    this.editor.generateFromTemplate(this.mosqueId, this.generateTemplateId, {
      from: this.generateFrom,
      to: this.generateTo,
      overwritePublished: this.overwritePublished,
      skipExisting: this.skipExisting,
      publish: this.publishGenerated,
      preview,
    }).subscribe({
      next: (res) => {
        this.busy.set(false);
        if (preview) {
          this.previewResult.set(res);
          this.snack.open(res.message || 'Preview ready.', 'OK', { duration: 3500 });
          return;
        }
        this.previewResult.set(null);
        this.snack.open(res.message || `Created ${res.created}, updated ${res.updated}, skipped ${res.skipped}.`, 'OK', {
          duration: 5000,
        });
      },
      error: (err) => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? (preview ? 'Preview failed.' : 'Generate failed.'), 'OK', { duration: 4500 });
      },
    });
  }
}
