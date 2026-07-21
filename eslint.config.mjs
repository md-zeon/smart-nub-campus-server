// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  files: ["**/*.{js,ts}"],
  ignores: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
  extends: [js.configs.recommended, tseslint.configs.recommended],
});
