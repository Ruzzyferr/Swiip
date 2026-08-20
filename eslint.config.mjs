import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.config.js', '**/babel.config.js', '**/metro.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    /* Kontrast denetimi Node'da çalışıyor ama gövdesinin bir kısmı `page.evaluate()`
       içinde, yani tarayıcıda değerlendiriliyor. Tarayıcı küreselleri o yüzden gerekli. */
    // Tarayıcı içinde çalışan denetim betikleri: gövdeleri `page.evaluate` ile
    // sayfaya taşınıyor, dolayısıyla DOM globalleri burada meşru.
    files: [
      'scripts/site-kontrast.mjs',
      'scripts/site-gorsel.mjs',
      'scripts/site-tipografi.mjs',
      'scripts/site-renk-denetimi.mjs',
    ],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  {
    // Marka sitesi: derleme adımı olmayan düz tarayıcı JS'i.
    files: ['apps/site/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        location: 'readonly',
        HTMLInputElement: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.mjs', '**/*.config.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
);
