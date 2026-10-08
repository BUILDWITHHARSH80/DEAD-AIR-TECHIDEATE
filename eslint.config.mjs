import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  { // Global disables for baseline
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'next/next/no-html-link-for-pages': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
<<<<<<< Updated upstream
=======
    files: ["frontend/**/*.{ts,tsx}"],
    rules: {
        "next/next/no-html-link-for-pages": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "react-hooks/purity": "off",
        "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["backend/**/*.{ts,tsx}"],
    rules: {
        "next/next/no-html-link-for-pages": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "react-hooks/purity": "off",
        "react-hooks/set-state-in-effect": "off",
    },
  },
  {
>>>>>>> Stashed changes
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
]);

export default eslintConfig;