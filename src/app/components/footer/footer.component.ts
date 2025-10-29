import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroMagnifyingGlass
} from '@ng-icons/heroicons/outline';
import { 
  lucideLinkedin,
  lucideYoutube,
  lucideGithub
} from '@ng-icons/lucide';

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterLinkGroup = {
  heading: string;
  links: FooterLink[];
};

type LogoLink = {
  href: string;
  alt: string;
  src: string;
};

type SocialLink = {
  href: string;
  label: string;
  iconName: string;
};

@Component({
  selector: 'app-footer-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      lucideLinkedin,
      lucideYoutube,
      lucideGithub
    })
  ],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterSectionsComponent {
  @Output() readonly search = new EventEmitter<string>();

  readonly logos: LogoLink[] = [
    {
      href: 'http://biocommons.org.au',
      alt: 'Australian BioCommons logo',
      src: 'https://images.squarespace-cdn.com/content/v1/5d3a4213cf4f5b00014ea1db/1690418382186-WCV54ZDHSSC3CIQ94MK2/Australian-Biocommons-Logo-Horizontal-RGB.png?format=300w',
    },
    {
      href: 'https://bioplatforms.com/',
      alt: 'Bioplatforms Australia logo',
      src: 'https://images.squarespace-cdn.com/content/v1/5d3a4213cf4f5b00014ea1db/1574384007383-HZO8HOU1FCS2O6CWQ8XQ/bioplatforms-audtralia-logo.png?format=300w',
    },
    {
      href: 'https://www.education.gov.au/ncris',
      alt: 'NCRIS logo',
      src: 'https://images.squarespace-cdn.com/content/v1/5d3a4213cf4f5b00014ea1db/1721773167630-02V5S6Z7X3HJ9C1EQHEK/NCRIS-PROVIDER+%281%29.png?format=300w',
    },
  ];

  readonly linkGroups: FooterLinkGroup[] = [
    {
      heading: 'Themes',
      links: [
        { label: 'Binder design', href: '/themes?tab=binder-design' },
        { label: 'Structure prediction', href: '/themes?tab=structure-prediction' },
        { label: 'Structure search', href: '/themes?tab=structure-search' },
      ],
    },
    {
      heading: 'Pre-config workflows',
      links: [
        { label: 'Single structure prediction', href: '/workflow?wf=single-structure-prediction' },
        { label: 'Interaction screening', href: '/workflow?wf=interaction-screening' },
      ],
    },
    {
      heading: 'Others',
      links: [
        { label: 'Tools', href: '/tools' },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Support', href: '/support' },
        { label: 'About', href: 'https://www.biocommons.org.au/about', external: true },
      ],
    },
  ];

  readonly socialLinks: SocialLink[] = [
    {
      href: 'https://linkedin.com/company/australianbiocommons',
      label: 'LinkedIn',
      iconName: 'lucideLinkedin',
    },
    {
      href: 'https://www.youtube.com/c/AustralianBioCommonsChannel',
      label: 'YouTube',
      iconName: 'lucideYoutube',
    },
    {
      href: 'https://github.com/AustralianBioCommons',
      label: 'GitHub',
      iconName: 'lucideGithub',
    },
  ];

  searchTerm = '';

  onSubmitSearch(): void {
    const trimmed = this.searchTerm.trim();
    this.search.emit(trimmed);
  }
}