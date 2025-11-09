import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadPage } from './upload-page.component';

describe('UploadPage', () => {
  let component: UploadPage;
  let fixture: ComponentFixture<UploadPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
