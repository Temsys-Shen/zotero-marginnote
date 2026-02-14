const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Simplified Release Build Script for MarginNote Addon
 * Uses 'pnpm exec' for minification to ensure simplicity and reliability.
 */

async function build() {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const version = pkg.version;
    const name = 'zotero-connector';
    const distDir = path.join(__dirname, '../dist');
    const srcDir = path.join(__dirname, '../src');
    const outputFilename = `${name}-v${version}.mnaddon`;
    const outputPath = path.join(__dirname, `../${outputFilename}`);

    console.log(`\n🚀 Starting build: ${name} v${version}`);

    // 1. Clean and Create Dist
    try {
        if (fs.existsSync(distDir)) {
            fs.rmSync(distDir, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn('⚠️  Warning: Permission error cleaning dist. Please close any tools using that folder and try again.');
    }

    if (!fs.existsSync(distDir)) {
        try {
            fs.mkdirSync(distDir);
        } catch (e) {
            console.error('❌ Error: Could not create dist directory. Permission denied.');
            process.exit(1);
        }
    }

    // 2. Copy all files from src to dist
    try {
        copyRecursiveSync(srcDir, distDir);
    } catch (e) {
        console.error('❌ Error: Copying failed. ' + e.message);
        process.exit(1);
    }

    // 3. Minify JS files
    const jsFiles = getAllFiles(distDir).filter(f => f.endsWith('.js'));
    console.log(`📦 Minifying ${jsFiles.length} JS files...`);
    for (const file of jsFiles) {
        try {
            execSync(`pnpm exec terser "${file}" -o "${file}" --compress --mangle`);
        } catch (e) {
            console.warn(`⚠️  Warning: Failed to minify ${path.basename(file)}.`);
        }
    }

    // 4. Minify HTML files
    const htmlFiles = getAllFiles(distDir).filter(f => f.endsWith('.html'));
    console.log(`📄 Minifying ${htmlFiles.length} HTML files...`);
    for (const file of htmlFiles) {
        try {
            execSync(`pnpm exec html-minifier-terser "${file}" -o "${file}" --collapse-whitespace --remove-comments --minify-js true --minify-css true`);
        } catch (e) {
            console.warn(`⚠️  Warning: Failed to minify ${path.basename(file)}.`);
        }
    }

    // 5. Minify CSS files
    const cssFiles = getAllFiles(distDir).filter(f => f.endsWith('.css'));
    console.log(`🎨 Minifying ${cssFiles.length} CSS files...`);
    for (const file of cssFiles) {
        try {
            execSync(`pnpm exec cleancss -o "${file}" "${file}"`);
        } catch (e) {
            console.warn(`⚠️  Warning: Failed to minify ${path.basename(file)}.`);
        }
    }

    // 6. Package as .mnaddon
    console.log(`🤐 Packaging to ${outputFilename}...`);
    if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (e) { }
    }

    try {
        const absOutputPath = path.resolve(outputPath);
        execSync(`cd "${distDir}" && zip -r -q "${absOutputPath}" .`);
        console.log(`\n✨ Build successful! -> ${outputFilename}\n`);
    } catch (e) {
        console.error(`❌ Error: Packaging failed. ${e.message}`);
        process.exit(1)
    }
}

function copyRecursiveSync(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(child => copyRecursiveSync(path.join(src, child), path.join(dest, child)));
    } else {
        fs.copyFileSync(src, dest);
    }
}

function getAllFiles(dir, files = []) {
    try {
        fs.readdirSync(dir).forEach(file => {
            const name = path.join(dir, file);
            if (fs.statSync(name).isDirectory()) getAllFiles(name, files);
            else files.push(name);
        });
    } catch (e) {
        console.warn(`⚠️  Warning: Could not scan directory ${dir}. Permission denied.`);
    }
    return files;
}

build();
