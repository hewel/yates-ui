import { Plugin } from "rolldown";

export function vanillaCssUrl({ fileName }: { fileName: string }): Plugin {
    return {
        name: 'get-vanilla-css-url',
        resolveId(id) {
            if (id === 'virtual:vanilla-bundle-url') {
                return '\0virtual:vanilla-bundle-url';
            }
        },
        load(id) {
            if (id === '\0virtual:vanilla-bundle-url') {
                return `export default "__VANILLA_BUNDLE_URL_PLACEHOLDER__";`;
            }
        },
        generateBundle(_options, bundle) {
            const cssAsset = Object.values(bundle).find(
                (asset) => asset.type === 'asset' && asset.names.includes(fileName)
            );
            if (!cssAsset) return;
            for (const chunk of Object.values(bundle)) {
                if (chunk.type === 'chunk') {
                    chunk.code = chunk.code.replace(
                        /"__VANILLA_BUNDLE_URL_PLACEHOLDER__"/g,
                        `"./${cssAsset.fileName}"`
                    );
                }
            }
        }
    }
}