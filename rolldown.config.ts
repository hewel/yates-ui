import { defineConfig } from 'rolldown';
import { vanillaExtractPlugin } from '@vanilla-extract/rollup-plugin';
import esbuild from 'rollup-plugin-esbuild';

import { vanillaCssUrl } from './plugins/vanillaCssUrl';
import { runAgs } from './plugins/runAgs';

export default defineConfig({
    platform: 'neutral',
    input: 'src/app.ts',
    watch: {
        include: ['src/**/*'],
    },
    output: {
        dir: "./dist",
        cleanDir: true,
        format: 'esm',

    },
    external: [
        /^gi:\/\//,
        /^resource:\/\//,
        /^ags\//,
        /^gnim\//,
        'system',
        'gettext'
    ],
    plugins: [
        esbuild({
            target: 'es2022',

            // Transform JSX for AGS
            jsx: 'automatic',
            jsxImportSource: 'ags/gtk4',

            // Crucial for GObject.Object registration: prevents class names from being mangled
            keepNames: true,

        }),
        vanillaExtractPlugin({
            extract: {
                name: 'style.css'
            }
        }),
        vanillaCssUrl({ fileName: 'style.css' }),
        runAgs()
    ]
});