import { Route } from '@angular/router';
import { WavListPageComponent } from './pages/wav-list-page/wav-list-page.component';
import { WavDetailPageComponent } from './pages/wav-detail-page/wav-detail-page.component';
import { ChunkNewPageComponent } from './pages/chunk-new-page/chunk-new-page.component';
import { ChunkDetailPageComponent } from './pages/chunk-detail-page/chunk-detail-page.component';

export const appRoutes: Route[] = [
  { path: '', component: WavListPageComponent },
  { path: 'wav/:id', component: WavDetailPageComponent },
  { path: 'wav/:id/chunks/new', component: ChunkNewPageComponent },
  { path: 'wav/:id/chunks/:chunkId', component: ChunkDetailPageComponent },
  { path: '**', redirectTo: '' },
];
