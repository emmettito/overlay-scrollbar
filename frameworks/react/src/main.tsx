// In dev, sets up fast refresh before any component loads, as there's no HTML page for the plugin to do it in. Empty
// in the build.
import '@vitejs/plugin-react/preamble';
import { createRoot } from 'react-dom/client';
import { defineDemo } from '../../shared/define-demo';
import { App } from './App';

defineDemo('react-demo', host => {
  const root = createRoot(host);
  root.render(<App />);
  return () => root.unmount();
});
