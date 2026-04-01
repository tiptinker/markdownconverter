const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const sharedFiles = [
    'background.js',
    'markdown-converter-core.js',
    'screenshot-utils.js',
    'sidebar.html',
    'sidebar.js',
    'styles.css',
    'styles-sidebar.css',
    'LICENSE'
];

const sharedDirs = [
    'images',
    'libs'
];

const excludedLibFiles = new Set([
    'html2pdf.bundle.min.js'
]);

const browserConfigs = {
    chrome: {
        manifestSource: 'manifest.json',
        extraFiles: [],
        outputDir: path.join(distDir, 'chrome')
    },
    firefox: {
        manifestSource: 'manifest-firefox.json',
        extraFiles: [],
        outputDir: path.join(distDir, 'firefox')
    }
};

function ensureCleanDirectory(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileRelative(sourceRelativePath, targetDir, targetRelativePath = sourceRelativePath) {
    const sourcePath = path.join(rootDir, sourceRelativePath);
    const targetPath = path.join(targetDir, targetRelativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
}

function copyDirectoryRecursive(sourceDir, targetDir) {
    const normalizedSourceDir = path.normalize(sourceDir);
    const libsDir = path.join(rootDir, 'libs');

    fs.cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: (sourcePath) => {
            if (path.dirname(path.normalize(sourcePath)) !== libsDir) {
                return true;
            }

            return !excludedLibFiles.has(path.basename(sourcePath));
        }
    });
}

function buildTarget(targetName) {
    const config = browserConfigs[targetName];
    if (!config) {
        throw new Error(`Unknown build target: ${targetName}`);
    }

    ensureCleanDirectory(config.outputDir);

    for (const file of sharedFiles) {
        copyFileRelative(file, config.outputDir);
    }

    for (const file of config.extraFiles) {
        copyFileRelative(file, config.outputDir);
    }

    for (const dir of sharedDirs) {
        copyDirectoryRecursive(path.join(rootDir, dir), path.join(config.outputDir, dir));
    }

    copyFileRelative(config.manifestSource, config.outputDir, 'manifest.json');

    console.log(`Built ${targetName} extension in ${config.outputDir}`);
}

function main() {
    const target = process.argv[2];

    if (target === 'clean') {
        fs.rmSync(distDir, { recursive: true, force: true });
        console.log(`Removed ${distDir}`);
        return;
    }

    if (!target) {
        buildTarget('chrome');
        buildTarget('firefox');
        return;
    }

    buildTarget(target);
}

main();