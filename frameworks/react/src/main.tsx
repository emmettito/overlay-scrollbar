import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { createRoot } from 'react-dom/client';
import '../../shared/demo.css';
import { followAppTheme } from '../../shared/theme';
import { App } from './App';

followAppTheme();

const app = document.getElementById('app');
if (!app) {
  throw new Error('No #app element to render into');
}
createRoot(app).render(<App />);
