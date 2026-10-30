// npm's prepack: refuses npm pack and npm publish from the repository itself, which would pack its package.json as it
// is, with its scripts, devDependencies and npm settings (unless run with --ignore-scripts, which skips this too).
// npm run package packs a staged copy without them (stage-package.mts), which has no prepack of its own; install the
// tarball it writes.
console.error("Pack with npm run package, which leaves out the repository's own scripts and settings, and install the");
console.error('tarball it writes (npm install <path to>/overlay-scrollbar-<version>.tgz).');
process.exit(1);
