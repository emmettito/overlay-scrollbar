import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { mount } from 'svelte';
import '../../shared/demo.css';
import { followAppTheme } from '../../shared/theme';
import App from './App.svelte';

followAppTheme();

const app = document.getElementById('app');
if (!app) {
  throw new Error('No #app element to mount into');
}
mount(App, { target: app });
