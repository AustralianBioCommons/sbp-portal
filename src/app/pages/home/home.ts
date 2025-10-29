import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BinderDesignComponent } from '../binder-design/binder-design';

export interface TabItem {
  id: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, BinderDesignComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private route = inject(ActivatedRoute);
  
  activeTab = signal('binder-design');

  tabs: TabItem[] = [
    {
      id: 'binder-design',
      label: 'Binder Design',
      description: 'Design and optimize protein binders for specific targets'
    },
    {
      id: 'structure-prediction',
      label: 'Structure Prediction',
      description: 'Predict protein structures using advanced algorithms'
    },
    {
      id: 'structure-search',
      label: 'Structure Search',
      description: 'Search and compare protein structures in databases'
    },
    {
      id: 'tools',
      label: 'Tools',
      description: 'Access various computational biology tools and utilities'
    }
  ];

  ngOnInit() {
    // Listen to query parameters to sync with header navigation
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab']);
      }
    });
  }

  isActiveTab(tabId: string): boolean {
    return this.activeTab() === tabId;
  }
}
