import pluginJest from 'eslint-plugin-jest';
import pluginCypress from 'eslint-plugin-cypress/flat';
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const config = [
    ...compat.config({
        extends: ["next/core-web-vitals", "next/typescript", "eslint:recommended"],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        }
    }),
    {
        files: ["**/__tests__/**/*.[jt]s?(x)", "**/__mocks__/**/*.[jt]s?(x)"],

        plugins: {
            pluginJest,
        },

        languageOptions: {
            globals: pluginJest.environments.globals.globals
        }
    }, {
        files: ["cypress/**/*.cy.[jt]s?(x)"],

        ...pluginCypress.configs.recommended,
    }
];

export default config