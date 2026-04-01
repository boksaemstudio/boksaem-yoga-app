import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactPlugin from "eslint-plugin-react";

export default [
  { ignores: ["dist", "build", "test_images.js", "eslint-report*.json", "lint_*.txt", "functions/**", "scripts/**", "oldLogsTab.js", "dev-dist", "dev-dist/**"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      // React 17+ JSX Transform — PropTypes 불필요
      "react/prop-types": "off",
      // 한국어 JSX 텍스트에서 따옴표 이스케이프 불필요
      "react/no-unescaped-entities": "off",
      // HOC/forwardRef 등에서 displayName 생략 허용
      "react/display-name": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }],
      // 의도적 의존성 생략 허용 (warn으로 유지)
      "react-hooks/exhaustive-deps": "warn",
      // 빈 catch 블록 허용
      "no-empty": ["error", { "allowEmptyCatch": true }],
      // [FIX] Downgrade strict react-hooks / compiler rules to warnings to prevent breaking legacy architecture
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
];
