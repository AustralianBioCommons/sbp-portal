import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterSectionsComponent } from './footer.component';

describe('FooterSectionsComponent', () => {
  let component: FooterSectionsComponent;
  let fixture: ComponentFixture<FooterSectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterSectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterSectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
