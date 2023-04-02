import { Component, Input } from '@angular/core';
import { HandGesture } from '../mirror-hgr';

@Component({
  selector: 'app-gesture-editor',
  templateUrl: './gesture-editor.component.html',
  styleUrls: ['./gesture-editor.component.scss'],
})
export class GestureEditorComponent {
  @Input() gestures?: Map<string, HandGesture>;

  selectedGesture?: HandGesture;

  onSelect(gesture: HandGesture) {
    this.selectedGesture = gesture;
  }
}
