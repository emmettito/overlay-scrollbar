// npm's prepack: refuses npm pack and npm publish from the repository itself, which would pack its package.json as it
// is, with its scripts, devDependencies and npm settings (unless run with --ignore-scripts, which skips this too).
// npm run package and npm run release pack and publish a staged copy without them (stage-package.mts), which has no
// prepack of its own.
console.error(
  "Publish with npm run release, or pack with npm run package, which leave out the repository's own scripts"
);
console.error('and settings.');
process.exit(1);
