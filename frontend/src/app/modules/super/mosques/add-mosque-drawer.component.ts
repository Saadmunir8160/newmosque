import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Mosque } from '../../../core/models';
import {
  MosqueSeedFormComponent,
  MosqueSeedSavedEvent,
} from './mosque-seed-form.component';

export type MosqueCreatedEvent = MosqueSeedSavedEvent;

@Component({
  selector: 'app-add-mosque-drawer',
  standalone: true,
  imports: [CommonModule, MosqueSeedFormComponent],
  templateUrl: './add-mosque-drawer.component.html',
  styleUrls: ['./add-mosque-drawer.component.css'],
})
export class AddMosqueDrawerComponent {
  @Input({ required: true }) open = false;
  @Input() editMosque: Mosque | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<MosqueCreatedEvent>();

  onSaved(event: MosqueSeedSavedEvent): void {
    this.saved.emit(event);
    this.closed.emit();
  }
}
