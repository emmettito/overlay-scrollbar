import { fileURLToPath } from 'node:url';
import { createServer, defineConfig, normalizePath, type Plugin } from 'vite';

const frameworks = ['angular', 'react', 'vue', 'svelte'];

/**
 * In dev, serves each framework demo from a Vite dev server of its own (each needs its framework's plugin), at
 * frameworks/<name>/ where the build puts it, so they update as you edit them, with no `npm run frameworks`.
 */
function frameworkDemos(): Plugin {
  return {
    name: 'framework-demos',
    apply: 'serve',
    async configureServer(server) {
      const demos = await Promise.all(
        frameworks.map(async name => {
          const base = `/frameworks/${name}/`;
          const demo = await createServer({
            configFile: fileURLToPath(new URL(`frameworks/${name}/vite.config.mts`, import.meta.url)),
            base,
            // Its own pre-bundled dependencies: sharing the app's, each server would re-bundle them over the others'
            cacheDir: fileURLToPath(new URL(`node_modules/.vite/frameworks/${name}`, import.meta.url)),
            // Hot updates over the app's own server, each demo's on its own path (its base)
            server: { middlewareMode: true, hmr: { server: server.httpServer ?? undefined } }
          });
          return { base, demo };
        })
      );
      // Added directly rather than returned, so these run before Vite's own, which would serve a stale build from public/
      server.middlewares.use((req, res, next) => {
        // The code panels' ?raw imports of the demos' files stay with the app: served by a demo's server, they'd be
        // modules with no importers there, which turn every edit to the file into a reload of the demo
        const raw = new URL(req.url ?? '/', 'http://localhost').searchParams.has('raw');
        const match = !raw && demos.find(({ base }) => req.url?.startsWith(base));
        if (match) {
          match.demo.middlewares(req, res, next);
        } else {
          next();
        }
      });
      server.httpServer?.on('close', () => demos.forEach(({ demo }) => demo.close()));
    },
    // The app imports the demos' files only as text, for the code panels (?raw), which would reload the whole page and
    // the demo with it: leaves their updates to the demos' own servers, and the panels to the next reload
    hotUpdate({ file }) {
      // Vite gives paths with forward slashes, also on Windows
      if (file.startsWith(normalizePath(fileURLToPath(new URL('frameworks/', import.meta.url))))) {
        return [];
      }
    }
  };
}

export default defineConfig({
  // Relative asset URLs, so the build works when opened straight from disk (see scripts/make-static.mts)
  base: './',
  plugins: [frameworkDemos()],
  // Only the app: the framework demos (frameworks/*) are Vite apps of their own, with their own plugins and aliases
  optimizeDeps: { entries: ['index.html'] }
});
