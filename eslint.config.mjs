import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// Flat ESLint config. Next.js 16 removed the `next lint` command and ships
// eslint-config-next as a native flat-config array, so linting runs through the
// ESLint CLI (`npm run lint`).
const eslintConfig = [
  { ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
];

export default eslintConfig;
