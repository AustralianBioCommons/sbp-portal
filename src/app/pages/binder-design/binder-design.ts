import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-binder-design',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './binder-design.html',
  styleUrls: ['./binder-design.scss']
})
export class BinderDesignComponent {
  // Preconfid workflows
  workflows = [
    { id: 'single-structure', label: 'Single Structure Prediction' },
    { id: 'interaction-screening', label: 'Interaction Screening' }
  ];

  // Tools
  tools = [
    { id: 'alphafold', label: 'AlphaFold' },
    { id: 'bindcraft', label: 'BindCraft' },
    { id: 'colabfold', label: 'ColabFold' },
    { id: 'rosettafold', label: 'RosettaFold' }
  ];

  // Community resources
  communityResources = [
    { title: 'Documentation', description: 'Comprehensive guides and tutorials for protein binder design' },
    { title: 'Community Forum', description: 'Connect with other researchers and share insights' },
    { title: 'Best Practices', description: 'Learn from established protocols and methodologies' },
    { title: 'Publication Repository', description: 'Access relevant research papers and publications' }
  ];
}