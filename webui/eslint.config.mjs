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
    ...compat.extends("next/core-web-vitals", "eslint:recommended"),
    {
        files: ["**/__tests__/**/*.[jt]s?(x)"],

        plugins: {
            pluginJest,
        },

        languageOptions: {
            globals: pluginJest.environments.globals.globals
        }
    }, {
        ...pluginCypress.configs.recommended,
        files: ["cypress/**/*.cy.[jt]s?(x)"],
    }
];

export default config