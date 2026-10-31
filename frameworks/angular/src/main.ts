import { createApplication } from '@angular/platform-browser';
import { defineDemo } from '../../shared/define-demo';
import { AngularDemo } from './angular-demo.component';

// An Angular app of its own on each <angular-demo>, with the demo component as its root
defineDemo('angular-demo', async host => {
  const app = await createApplication();
  app.bootstrap(AngularDemo, host);
  return () => app.destroy();
});
