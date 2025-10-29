import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

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

  describe('onSubmitSearch', () => {
    it('should emit search event with trimmed search term', () => {
      spyOn(component.search, 'emit');
      component.searchTerm = '  test query  ';
      
      component.onSubmitSearch();
      
      expect(component.search.emit).toHaveBeenCalledWith('test query');
    });

    it('should emit empty string when search term is only whitespace', () => {
      spyOn(component.search, 'emit');
      component.searchTerm = '   ';
      
      component.onSubmitSearch();
      
      expect(component.search.emit).toHaveBeenCalledWith('');
    });

    it('should emit empty string when search term is empty', () => {
      spyOn(component.search, 'emit');
      component.searchTerm = '';
      
      component.onSubmitSearch();
      
      expect(component.search.emit).toHaveBeenCalledWith('');
    });
  });

  describe('data properties', () => {
    it('should have correct logos data', () => {
      expect(component.logos.length).toBe(3);
      expect(component.logos[0]).toEqual({
        href: 'http://biocommons.org.au',
        alt: 'Australian BioCommons logo',
        src: 'https://images.squarespace-cdn.com/content/v1/5d3a4213cf4f5b00014ea1db/1690418382186-WCV54ZDHSSC3CIQ94MK2/Australian-Biocommons-Logo-Horizontal-RGB.png?format=300w'
      });
    });

    it('should have correct link groups data', () => {
      expect(component.linkGroups.length).toBe(3);
      expect(component.linkGroups[0].heading).toBe('Themes');
      expect(component.linkGroups[0].links.length).toBe(3);
      expect(component.linkGroups[0].links[0]).toEqual({
        label: 'Binder design',
        href: '/themes?tab=binder-design'
      });
    });

    it('should have correct social links data', () => {
      expect(component.socialLinks.length).toBe(3);
      expect(component.socialLinks[0]).toEqual({
        href: 'https://linkedin.com/company/australianbiocommons',
        label: 'LinkedIn',
        iconName: 'lucideLinkedin'
      });
    });
  });

  describe('template integration', () => {
    it('should initialize searchTerm as empty string', () => {
      expect(component.searchTerm).toBe('');
    });

    it('should render all logo links', () => {
      const logoElements = fixture.debugElement.queryAll(By.css('img[alt*="logo"]'));
      expect(logoElements.length).toBeGreaterThan(0);
    });

    it('should render social links with icons', () => {
      const socialElements = fixture.debugElement.queryAll(By.css('ng-icon'));
      expect(socialElements.length).toBeGreaterThan(0);
    });
  });
});
