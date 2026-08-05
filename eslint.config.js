import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "puzzles/**", "docs/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["packages/*/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // 盤面の状態は core の reducer に寄せるため、フックの依存配列の誤りは
    // 取り消し(undo)の不具合として表に出る。ここは緩めない。
    files: ["packages/web/src/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);
