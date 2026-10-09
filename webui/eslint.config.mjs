import pluginJest from 'eslint-plugin-jest';
import pluginCypress from 'eslint-plugin-cypress/flat';
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
    ...nextCoreWebVitals,
    ...nextTypescript,
    js.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            // React Compiler rules added by eslint-plugin-react-hooks v7 (bundled
            // with eslint-config-next 16) that existing code does not meet yet.
            // Off to keep lint where it was on Next 15; to be adopted gradually.
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/static-components': 'off',
        }
    },
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