import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { NotFoundComponent } from './not-found';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 404 error number', () => {
    const errorNumber = fixture.debugElement.query(By.css('.error-number'));
    expect(errorNumber.nativeElement.textContent.trim()).toBe('404');
  });

  it('should display "Page Not Found" subtitle', () => {
    const errorSubtitle = fixture.debugElement.query(By.css('.error-subtitle'));
    expect(errorSubtitle.nativeElement.textContent.trim()).toBe('Page Not Found');
  });

  it('should display Australian BioCommons Portal title', () => {
    const brandTitle = fixture.debugElement.query(By.css('.brand-title'));
    expect(brandTitle.nativeElement.textContent.trim()).toBe('Australian BioCommons Portal');
  });

  it('should have three suggestion cards', () => {
    const suggestionCards = fixture.debugElement.queryAll(By.css('.suggestion-card'));
    expect(suggestionCards.length).toBe(3);
  });

  it('should navigate to themes when goHome is called', () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    
    component.goHome();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/themes']);
  });

  it('should navigate to themes with search params when searchResources is called', () => {
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    
    component.searchResources();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/themes'], { queryParams: { search: 'true' } });
  });

  it('should call window.history.back when goBack is called', () => {
    spyOn(window.history, 'back');
    
    component.goBack();
    
    expect(window.history.back).toHaveBeenCalled();
  });

  it('should have popular links with correct routes', () => {
    const popularLinks = fixture.debugElement.queryAll(By.css('.popular-link'));
    expect(popularLinks.length).toBe(4);
    
    const expectedRoutes = [
      '/themes?tab=binder-design',
      '/themes?tab=structure-prediction', 
      '/themes?tab=structure-search',
      '/single-structure-prediction'
    ];
    
    popularLinks.forEach((link, index) => {
      expect(link.attributes['routerLink']).toBe(expectedRoutes[index]);
    });
  });

  it('should have support email link', () => {
    const supportLink = fixture.debugElement.query(By.css('.support-link'));
    expect(supportLink.nativeElement.getAttribute('href')).toBe('mailto:support@biocommons.org.au');
  });

  it('should trigger goHome when home button is clicked', () => {
    spyOn(component, 'goHome');
    
    const homeButton = fixture.debugElement.query(By.css('.suggestion-button.primary'));
    homeButton.nativeElement.click();
    
    expect(component.goHome).toHaveBeenCalled();
  });

  it('should trigger goBack when back button is clicked', () => {
    spyOn(component, 'goBack');
    
    const backButton = fixture.debugElement.query(By.css('.suggestion-button.secondary'));
    backButton.nativeElement.click();
    
    expect(component.goBack).toHaveBeenCalled();
  });

  it('should trigger searchResources when search button is clicked', () => {
    spyOn(component, 'searchResources');
    
    const searchButton = fixture.debugElement.query(By.css('.suggestion-button.accent'));
    searchButton.nativeElement.click();
    
    expect(component.searchResources).toHaveBeenCalled();
  });
});