import { bootstrapApplication } from '@angular/platform-browser';
import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import '../../shared/demo.css';
import { followAppTheme } from '../../shared/theme';
import { AngularDemo } from './angular-demo.component';

followAppTheme();

bootstrapApplication(AngularDemo).catch(err => console.error(err));
