import { mount, unmount } from 'svelte';
import { defineDemo } from '../../shared/define-demo';
import App from './App.svelte';

defineDemo('svelte-demo', host => {
  const app = mount(App, { target: host });
  return () => void unmount(app);
});
