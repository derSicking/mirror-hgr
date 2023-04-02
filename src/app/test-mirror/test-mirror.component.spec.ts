import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestMirrorComponent } from './test-mirror.component';

describe('TestMirrorComponent', () => {
  let component: TestMirrorComponent;
  let fixture: ComponentFixture<TestMirrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestMirrorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestMirrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
