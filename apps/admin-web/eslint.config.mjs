import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next.prepush-check/**",
      "node_modules/**",
      "coverage/**",
      "public/sw.js",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
