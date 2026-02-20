import { defineConfig } from 'rolldown';
import swc from 'unplugin-swc';
import { vanillaExtractPlugin } from '@vanilla-extract/rollup-plugin';
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
        // preserveModules: true,
    },
    external: (id) => {
        return id.startsWith("ags");
    },
    plugins: [
        swc.rolldown(),
        vanillaExtractPlugin({
            extract: {
                name: 'style.css'
            }
        }),
        vanillaCssUrl({ fileName: 'style.css' }),
        runAgs()
    ]
});