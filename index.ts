import { promises as fs, PathLike } from 'fs';
import * as path from 'path';
import { posix } from 'path';
import { ViteDevServer } from 'vite';
import { optimize, Config } from 'svgo';

type SvgFile = {
    id: string;
    filePath: string;
};

export interface PluginOptions {
    iconsDir: string;
    outDir: string;
    svgoConfig?: Config;
    debounceWait?: number;
}

const DEFAULT_SVGO_CONFIG: Config = {
    multipass: true,
    plugins: [
        { name: 'removeAttrs', params: { attrs: ['width', 'height', 'id'] } },
        { name: 'removeStyleElement' },
        {
            name: 'addAttributesToSVGElement',
            params: { attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }] },
        },
        { name: 'removeXMLProcInst' },
        { name: 'removeComments' },
        { name: 'removeDoctype' },
        { name: 'convertShapeToPath' },
    ],
    js2svg: { pretty: false, indent: 0 },
};

export default function IconSpritePlugin({
    iconsDir, outDir, svgoConfig = DEFAULT_SVGO_CONFIG, debounceWait = 100,
}: PluginOptions) {
    const logError = (message: string, error?: unknown) => {
        console.error(`[IconSpritePlugin] ${message}`, error instanceof Error ? error.message : error);
    };

    const validateDirectories = async (): Promise<void> => {
        if (!iconsDir || !outDir) {
            throw new Error('Both iconsDir and outDir must be specified');
        }
        const iconsDirStat = await fs.stat(iconsDir);
        if (!iconsDirStat.isDirectory()) {
            throw new Error('iconsDir must be a directory');
        }
        const outDirStat = await fs.stat(outDir);
        if (!outDirStat.isDirectory()) {
            throw new Error('outDir must be a directory');
        }
    };

    const debounce = (func: Function, timeout = 300) => {
        let timer: NodeJS.Timeout;
        return (...args: any) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func(...args); }, timeout);
        };
    }
    const ensureDirectoriesExist = async (iconsPath: PathLike, outputPath: PathLike): Promise<void> => {
        try {
            await fs.access(iconsPath);
        } catch {
            throw new Error(`Source directory ${iconsPath} does not exist`);
        }
        try {
            await fs.access(outputPath);
        } catch {
            await fs.mkdir(outputPath, { recursive: true });
            console.log(`Output directory ${outputPath} created`);
        }
    };

    const getSvgFiles = async (dir: string, baseDir: string): Promise<SvgFile[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: SvgFile[] = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory()) {
                files.push(...(await getSvgFiles(fullPath, baseDir)));
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
                const id = posix
                    .normalize(relativePath)
                    .replace(/\.svg$/i, '')
                    .replace(/[^a-zA-Z0-9-_]/g, '_');
                files.push({ id, filePath: fullPath });
                console.log(`Found SVG: ${fullPath} with ID: ${id}`);
            }
        }
        return files;
    };

    const optimizeSvg = async (content: string, id: string, filePath: string): Promise<string> => {
        const result = optimize(content, { ...svgoConfig, path: filePath });

        if ('error' in result && result.error) {
            throw new Error(`Failed to optimize ${filePath}: ${result.error}`);
        }

        return result.data
            .replace(/<svg([^>]*)>/i, `<symbol id="${id}"$1>`)
            .replace(/<\/svg>/i, '</symbol>');
    };

    const generateIconSprite = async (): Promise<void> => {
        try {
            validateDirectories();
            const iconsPath = path.resolve(process.cwd(), iconsDir);
            const outputPath = path.resolve(process.cwd(), outDir);
            await ensureDirectoriesExist(iconsPath, outputPath);

            const files = await getSvgFiles(iconsPath, iconsPath);
            if (!files.length) {
                console.warn('[IconSpritePlugin] No SVG files found in', iconsPath);
                return;
            }

            const symbols = await Promise.all(
                files.map(async ({ id, filePath }) => {
                    try {
                        const svgContent = await fs.readFile(filePath, 'utf8');
                        return await optimizeSvg(svgContent, id, filePath);
                    } catch (error) {
                        logError(`Error processing ${filePath}`, error);
                        return '';
                    }
                })
            );

            const spriteContent = `<svg width="0" height="0" style="display: none">\n${symbols.filter(Boolean).join('\n')}\n</svg>`;
            await fs.writeFile(path.join(outputPath, 'icon-sprite.svg'), spriteContent);
            console.log('Icon sprite generated successfully!');
        } catch (error) {
            logError('Failed to generate icon sprite', error);
        }
    };

    const debouncedGenerateSprite = debounce(generateIconSprite, debounceWait);

    return {
        name: 'IconSpritePlugin',
        buildStart() {
            return generateIconSprite();
        },
        configureServer(server: ViteDevServer) {
            const iconsPath = path.resolve(process.cwd(), iconsDir);
            server.watcher.add(path.join(iconsPath, '**/*.svg'));

            server.watcher.on('change', async (changedPath: string) => {
                if (
                    changedPath.toLowerCase().endsWith('.svg') &&
                    !changedPath.includes('icon-sprite.svg')
                ) {
                    console.log(`SVG file changed: ${changedPath}`);
                    await debouncedGenerateSprite();
                    server.ws.send({ type: 'full-reload' });
                }
            });
        },
    };
}

