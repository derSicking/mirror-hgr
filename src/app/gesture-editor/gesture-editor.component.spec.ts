import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestureEditorComponent } from './gesture-editor.component';

describe('GestureEditorComponent', () => {
  let component: GestureEditorComponent;
  let fixture: ComponentFixture<GestureEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GestureEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestureEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
