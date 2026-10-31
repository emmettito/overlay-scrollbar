import { createApp } from 'vue';
import { defineDemo } from '../../shared/define-demo';
import App from './App.vue';

defineDemo('vue-demo', host => {
  const app = createApp(App);
  app.mount(host);
  return () => app.unmount();
});
