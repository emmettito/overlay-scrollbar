import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { createApp } from 'vue';
import '../../shared/demo.css';
import { followAppTheme } from '../../shared/theme';
import App from './App.vue';

followAppTheme();

createApp(App).mount('#app');
