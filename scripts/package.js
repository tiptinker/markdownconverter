const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const webExtCliPath = path.join(rootDir, 'node_modules', 'web-ext', 'bin', 'web-ext.js');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function ensureDirectory(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function removeFileIfExists(filePath) {
    fs.rmSync(filePath, { force: true });
}

function runCommand(command, args, cwd = rootDir) {
    const executable = command === 'web-ext' ? process.execPath : command;
    const commandArgs = command === 'web-ext' ? [webExtCliPath, ...args] : args;
    const result = spawnSync(executable, commandArgs, {
        cwd,
        stdio: 'inherit'
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
}

function getPackageVersion() {
    return readJson('package.json').version;
}

function getFirefoxArtifactName() {
    const manifest = readJson(path.join('dist', 'firefox', 'manifest.json'));
    const normalizedName = manifest.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return `${normalizedName}-${manifest.version}.zip`;
}

function zipDirectory(sourceDir, destinationZip) {
    return new Promise((resolve, reject) => {
        ensureDirectory(path.dirname(destinationZip));
        removeFileIfExists(destinationZip);

        const output = fs.createWriteStream(destinationZip);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

async function packageChrome(version) {
    const chromeReleaseDir = path.join(releaseDir, 'chrome');
    const chromeZipPath = path.join(chromeReleaseDir, `markdown_converter-${version}.zip`);

    runCommand(process.execPath, ['scripts/build.js', 'chrome']);
    await zipDirectory(path.join(distDir, 'chrome'), chromeZipPath);
    console.log(`Packaged chrome extension: ${chromeZipPath}`);
}

function packageFirefox() {
    const firefoxReleaseDir = path.join(releaseDir, 'firefox');

    runCommand(process.execPath, ['scripts/build.js', 'firefox']);
    ensureDirectory(firefoxReleaseDir);

    const firefoxZipPath = path.join(firefoxReleaseDir, getFirefoxArtifactName());
    removeFileIfExists(firefoxZipPath);

    runCommand('web-ext', ['build', '--overwrite-dest', '--artifacts-dir', path.join('..', '..', 'release', 'firefox')], path.join(distDir, 'firefox'));
    console.log(`Packaged firefox extension: ${firefoxZipPath}`);
}

async function main() {
    const target = process.argv[2];
    const version = getPackageVersion();

    if (!target || target === 'chrome') {
        await packageChrome(version);
    }

    if (!target || target === 'firefox') {
        packageFirefox();
    }

    if (target && !['chrome', 'firefox'].includes(target)) {
        throw new Error(`Unknown package target: ${target}`);
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});