import { ViteDevServer } from 'vite';
export default function IconSpritePlugin(iconsDir: string, outDir: string): {
    name: string;
    buildStart(): Promise<void>;
    configureServer(server: ViteDevServer): void;
};
