import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // ⚠️ **`.claude/worktrees/` を外すこと。**
    //    並列作業の worktree はリポジトリの複製なので、そこにも tsconfig.json がある。
    //    外さないと typescript-eslint が「tsconfigRootDir の候補が複数ある」と言って
    //    **1 つも lint できずに落ちる**(2026-08-06 に踏んだ)。
    //    ⚠️ CI には worktree が無いので、**手元でだけ落ちる**種類の壊れ方である。
    ignores: ["**/dist/**", "**/node_modules/**", "puzzles/**", "docs/**", ".claude/**"],
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
