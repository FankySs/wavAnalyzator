import { Route } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { UploadPageComponent } from './pages/upload-page/upload-page.component';
import { AnalyzePageComponent } from './pages/analyze-page/analyze-page.component';

export const appRoutes: Route[] = [
  { path: '', component: HomePageComponent },
  { path: 'upload', component: UploadPageComponent },
  { path: 'analyze', component: AnalyzePageComponent },
];
