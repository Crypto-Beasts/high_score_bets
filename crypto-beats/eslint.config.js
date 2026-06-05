import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "server/**", "scripts/**", "**/*.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        prompt: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        requestAnimationFrame: "readonly",
        KeyboardEvent: "readonly",
        WheelEvent: "readonly",
        AudioContext: "readonly",
      },
    },
    rules: {
      // Discourage `any` — it should be a deliberate, rare escape hatch.
      "@typescript-eslint/no-explicit-any": "warn",
      // Noisy on intentional defensive default-initializations; not a consistency concern.
      "no-useless-assignment": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
