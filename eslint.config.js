// Root ESLint config (monorepo)
// Using flat config (ESLint v9). We extend per-package if needed.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Custom rule implementation (inline) for Section 9:
// Detect usage of deprecated project wrappers (createProject / getProject / getUserProjects)
// outside of the core package path. We implement as a minimal custom rule here.
const deprecatedWrappersRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow deprecated project wrapper usage outside core' },
    messages: {
      deprecatedWrapper: 'Usage de {{name}} déprécié : utiliser l\'API workspace équivalente.'
    }
  },
  create(context) {
    // Core package path heuristic: any file path including 'packages/core'
    const isCoreFile = context.filename.includes('packages/core');
    if (isCoreFile) return {}; // allow inside core (compat layer)
    function reportIf(node, name) {
      if (['createProject','getProject','getUserProjects'].includes(name)) {
        context.report({ node, messageId: 'deprecatedWrapper', data: { name } });
      }
    }
    return {
      Identifier(node) {
        reportIf(node, node.name);
      }
    };
  }
};

export default [
  // Ignore dist outputs & build/helper mjs scripts (non-typed gating scope)
  { ignores: ['**/dist/**','**/node_modules/**','**/*.mjs'] },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  js.configs.recommended,
  {
    files: ['**/*.ts','**/*.tsx','**/*.js','**/*.jsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      'deprecated-wrappers': { rules: { 'no-deprecated-project-wrappers': deprecatedWrappersRule } }
    },
    rules: {
      'deprecated-wrappers/no-deprecated-project-wrappers': 'warn'
    }
  }
];
