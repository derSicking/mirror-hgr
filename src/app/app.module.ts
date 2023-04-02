import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { TestMirrorComponent } from './test-mirror/test-mirror.component';

import { FormsModule } from '@angular/forms';
import { GestureEditorComponent } from './gesture-editor/gesture-editor.component';

@NgModule({
  declarations: [AppComponent, TestMirrorComponent, GestureEditorComponent],
  imports: [BrowserModule, FormsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
