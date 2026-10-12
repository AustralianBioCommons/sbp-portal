import { Component, ChangeDetectionStrategy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroMagnifyingGlass } from "@ng-icons/heroicons/outline";
import {
  bootstrapLinkedin,
  bootstrapYoutube,
  bootstrapGithub,
  bootstrapBluesky,
} from "@ng-icons/bootstrap-icons";

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
  selector: "app-footer",
  imports: [FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      bootstrapLinkedin,
      bootstrapYoutube,
      bootstrapGithub,
      bootstrapBluesky,
    }),
  ],
  templateUrl: "./footer.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: "./footer.component.scss",
})
export class FooterSectionsComponent {
  readonly logos: LogoLink[] = [
    {
      href: "http://biocommons.org.au",
      alt: "Australian BioCommons logo",
      src: "/assets/images/Australian-Biocommons-Logo-Horizontal-RGB.png",
    },
    {
      href: "https://bioplatforms.com/",
      alt: "Bioplatforms Australia logo",
      src: "/assets/images/bioplatforms-australia-logo.png",
    },
    {
      href: "https://www.education.gov.au/ncris",
      alt: "NCRIS logo",
      src: "/assets/images/ncris-provider.png",
    },
  ];

  readonly linkGroups: FooterLinkGroup[] = [
    {
      heading: "Themes",
      links: [
        { label: "Binder design", href: "/binder-design" },
        { label: "Structure prediction", href: "/structure-prediction" },
      ],
    },
    {
      heading: "Workflows",
      links: [
        { label: "De novo design", href: "/binder-design/de-novo-design" },
        {
          label: "Single prediction",
          href: "/structure-prediction/single-prediction",
        },
        {
          label: "Bulk prediction",
          href: "/structure-prediction/bulk-prediction",
        },
        {
          label: "Interaction screening",
          href: "/structure-prediction/interaction-screening",
        },
      ],
    },
    {
      heading: "Other",
      links: [
        { label: "My Jobs", href: "/my-jobs" },
        {
          label: "Support",
          href: "https://biocommons-sbp-help.freshdesk.com/support/tickets/new",
          external: true,
        },
      ],
    },
  ];

  readonly socialLinks: SocialLink[] = [
    {
      href: "https://linkedin.com/company/australianbiocommons",
      label: "LinkedIn",
      iconName: "bootstrapLinkedin",
    },
    {
      href: "https://www.youtube.com/c/AustralianBioCommonsChannel",
      label: "YouTube",
      iconName: "bootstrapYoutube",
    },
    {
      href: "https://github.com/AustralianBioCommons",
      label: "GitHub",
      iconName: "bootstrapGithub",
    },
    {
      href: "https://bsky.app/profile/ausbiocommons.bsky.social",
      label: "Bluesky",
      iconName: "bootstrapBluesky",
    },
  ];
}
