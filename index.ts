import { promises as fs, PathLike } from 'fs';
import * as path from 'path';
import { ViteDevServer } from 'vite';

type SvgFile = {
    id: string;
    filePath: string;
};

export default function IconSpritePlugin(iconsDir: string, outDir: string) {

    async function ensureDirectoriesExist(iconsDirectory: PathLike, outputPath: PathLike): Promise<void> {
        try {
            await fs.access(iconsDirectory);
        } catch {
            throw new Error(`Source directory ${iconsDir} does not exist`);
        }

        try {
            await fs.access(outputPath);
        } catch {
            await fs.mkdir(outputPath, { recursive: true });
            console.log(`Output directory ${outDir} created`);
        }
    }
    function validateDirectories(): void {
        if (!iconsDir || !outDir) {
            throw new Error('Both iconsDir (source directory for SVG icons) and outDir (output directory) must be specified');
        }
    }
    async function getSvgFiles(dir: string, baseDir: string): Promise<SvgFile[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: SvgFile[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory()) {
                const subFiles = await getSvgFiles(fullPath, baseDir);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.svg')) {
                const id = relativePath.replace('.svg', '').replace(/\\/g, '_');
                files.push({ id, filePath: fullPath });
            }
        }
        return files;
    }

    async function generateIconSprite(): Promise<void> {
        await validateDirectories();
        const iconsPath = path.join(process.cwd(), iconsDir);
        const outputPath = path.join(process.cwd(), outDir);
        await ensureDirectoriesExist(iconsPath, outputPath);
        const files = await getSvgFiles(iconsPath, iconsPath);
        let symbols = '';

        for (const { id, filePath } of files) {
            let svgContent = await fs.readFile(filePath, 'utf8');

            svgContent = svgContent
                .replace(/id="[^"]+"/g, '')
                .replace(/<svg([^>]+)width="[^"]*"([^>]+)>/, '<svg$1$2>')
                .replace(/<svg([^>]+)height="[^"]*"([^>]+)>/, '<svg$1$2>')
                .replace('<svg', `<symbol id="${id}"`)
                .replace('</svg>', '</symbol>');

            symbols += svgContent + '\n';
        }

        const sprite = `<svg width="0" height="0" style="display: none">\n${symbols}</svg>`;
        await fs.writeFile(path.join(outputPath, 'icon-sprite.svg'), sprite);
        console.log('Icon sprite generated successfully!');
    }

    return {
        name: 'IconSpritePlugin',

        buildStart() {
            return generateIconSprite();
        },

        configureServer(server: ViteDevServer) {
            const iconsPath = path.join(process.cwd(), iconsDir);
            server.watcher.add(path.join(iconsPath, '**/*.svg'));

            server.watcher.on('change', async (changedPath: string) => {
                if (changedPath.endsWith('.svg') && !changedPath.includes('icon-sprite.svg')) {
                    console.log(`SVG file changed: ${changedPath}`);
                    await generateIconSprite();
                }
            });
        },
    };
}
