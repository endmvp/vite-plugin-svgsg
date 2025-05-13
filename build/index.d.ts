import { ViteDevServer } from 'vite';
import { Config } from 'svgo';
export interface PluginOptions {
    iconsDir: string;
    outDir: string;
    svgoConfig?: Config;
    debounceWait?: number;
}
export default function IconSpritePlugin({ iconsDir, outDir, svgoConfig, debounceWait, }: PluginOptions): {
    name: string;
    buildStart(): Promise<void>;
    configureServer(server: ViteDevServer): void;
};
