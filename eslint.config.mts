// typescript-eslint's recommended rules for all the code, angular-eslint's for the Angular demo, Vue's and Svelte's for
// theirs, and a few conventions: class members in a fixed order, and in TypeScript explicit accessibility and return
// types. Formatting is Prettier's (eslint-config-prettier turns off the rules it would clash with).
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import angular from 'angular-eslint';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'];
const jsFiles = ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'];

const sharedRules: Linter.RulesRecord = {
  // Warns on the `!` non-null assertion, e.g. `user!.name`.
  '@typescript-eslint/no-non-null-assertion': 'warn',
  // Requires overloads of the same function to be next to each other.
  '@typescript-eslint/adjacent-overload-signatures': 'error',
  // Requires `namespace` rather than `module` for TypeScript namespaces.
  '@typescript-eslint/prefer-namespace-keyword': 'error',
  // Reports empty functions; the TypeScript version replaces the core rule.
  'no-empty-function': 'off',
  '@typescript-eslint/no-empty-function': 'error',
  // Reports type annotations TypeScript can infer, e.g. `const x: number = 1`.
  '@typescript-eslint/no-inferrable-types': 'error',
  // Reports unused variables, as a warning rather than recommended's error.
  '@typescript-eslint/no-unused-vars': 'warn',
  // Reports empty interfaces, e.g. `interface Foo {}`.
  '@typescript-eslint/no-empty-interface': 'error',
  // Reports the `any` type, as a warning rather than recommended's error.
  '@typescript-eslint/no-explicit-any': 'warn',
  // Allows `require()`, which recommended reports, e.g. in config files and scripts.
  '@typescript-eslint/no-require-imports': 'off'
};

const recommended = [js.configs.recommended, ...tseslint.configs.recommended];

const typescriptConfig = defineConfig({
  files: tsFiles,
  extends: recommended,
  plugins: { '@typescript-eslint': tseslint.plugin },
  languageOptions: {
    parser: tseslint.parser,
    sourceType: 'module',
    parserOptions: { tsconfigRootDir: import.meta.dirname }
  },
  rules: sharedRules
});

const javascriptConfig = defineConfig({
  files: jsFiles,
  extends: recommended,
  plugins: { '@typescript-eslint': tseslint.plugin },
  languageOptions: {
    parser: tseslint.parser,
    sourceType: 'module',
    globals: { ...globals.browser, ...globals.node }
  },
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    ...sharedRules
  }
});

// The Angular demo's code and inline templates
const angularConfig = defineConfig(
  // Scoped last, so it holds even if a preset names files of its own. Cast, as typescript-eslint's config type differs
  // slightly from ESLint's.
  ...angular.configs.tsRecommended.map(
    config => ({ ...config, files: ['frameworks/angular/**/*.ts'] }) as Linter.Config
  ),
  {
    files: ['frameworks/angular/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2015, ...globals.node } },
    processor: angular.processInlineTemplates,
    plugins: { '@angular-eslint': angular.tsPlugin }
  },
  {
    files: ['frameworks/angular/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility]
  }
);

// The Vue and Svelte demos' components: the same rules as the rest of the code, then their frameworks' (whose parsers
// replace typescript-eslint's, and hand the scripts to it)
const componentFiles = ['**/*.vue', '**/*.svelte'];
const componentConfig = defineConfig(
  {
    files: ['**/*.vue'],
    extends: [...recommended, ...vue.configs['flat/recommended']],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: sharedRules
  },
  {
    files: ['**/*.svelte'],
    extends: [...recommended, ...svelte.configs.recommended, ...svelte.configs.prettier],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: sharedRules
  }
);

export default [
  {
    ignores: ['**/dist', 'lib', 'public/frameworks']
  },
  ...typescriptConfig,
  ...javascriptConfig,
  ...angularConfig,
  ...componentConfig,
  // After the presets, before the rules below that re-enable some formatting rules
  prettier,
  {
    files: [...tsFiles, ...jsFiles, ...componentFiles],
    plugins: {
      '@perfectionist': perfectionist,
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/no-extra-semi': ['error'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/ban-types': ['off'],
      '@typescript-eslint/no-empty-function': ['off'],
      '@typescript-eslint/no-inferrable-types': ['off'],
      '@typescript-eslint/no-wrapper-object-types': ['off'],
      '@perfectionist/sort-classes': [
        'warn',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
          specialCharacters: 'keep',
          partitionByComment: false,
          partitionByNewLine: false,
          newlinesBetween: 'ignore',
          ignoreCallbackDependenciesPatterns: ['^(computed|linkedSignal)$'],
          groups: [
            ['private-property', 'private-accessor-property', 'private-get-method', 'private-set-method'],
            ['protected-property', 'protected-accessor-property', 'protected-get-method', 'protected-set-method'],
            ['property', 'accessor-property', 'get-method', 'set-method'],
            'constructor',
            'ngOnInit',
            'ngOnChanges',
            'ngDoCheck',
            'ngAfterContentInit',
            'ngAfterContentChecked',
            'ngAfterViewInit',
            'ngAfterViewChecked',
            'ngOnDestroy',
            ['method', 'function-property'],
            ['protected-method', 'protected-function-property'],
            ['private-method', 'private-function-property'],
            'unknown'
          ],
          customGroups: [
            // Angular component lifecycle hooks, in the order described by https://angular.dev/guide/components/lifecycle
            { groupName: 'ngOnInit', elementNamePattern: 'ngOnInit' },
            { groupName: 'ngOnChanges', elementNamePattern: 'ngOnChanges' },
            { groupName: 'ngDoCheck', elementNamePattern: 'ngDoCheck' },
            { groupName: 'ngAfterContentInit', elementNamePattern: 'ngAfterContentInit' },
            { groupName: 'ngAfterContentChecked', elementNamePattern: 'ngAfterContentChecked' },
            { groupName: 'ngAfterViewInit', elementNamePattern: 'ngAfterViewInit' },
            { groupName: 'ngAfterViewChecked', elementNamePattern: 'ngAfterViewChecked' },
            { groupName: 'ngOnDestroy', elementNamePattern: 'ngOnDestroy' }
          ],
          useExperimentalDependencyDetection: false
        }
      ]
    }
  },
  // Rules that need TypeScript syntax to fix (`public`/`private`, return type annotations, etc.)
  {
    files: [...tsFiles, ...componentFiles],
    rules: {
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        {
          overrides: {
            constructors: 'no-public'
          }
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ]
    }
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/ban-ts-comment': ['off']
    }
  }
];
