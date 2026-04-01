/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { execSync } from 'child_process';
import { spawn } from 'cross-spawn'
// Added lines below
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const binDir = path.resolve(__dirname, '../../../../../../../node_modules/.bin');
const scopeTailwindCmd = path.join(binDir, process.platform === 'win32' ? 'scope-tailwind.cmd' : 'scope-tailwind');
const tsupCmd = path.join(binDir, process.platform === 'win32' ? 'tsup.cmd' : 'tsup');
const nodemonCmd = path.join(binDir, process.platform === 'win32' ? 'nodemon.cmd' : 'nodemon');

function doesPathExist(filePath) {
	try {
		const stats = fs.statSync(filePath);

		return stats.isFile();
	} catch (err) {
		if (err.code === 'ENOENT') {
			return false;
		}
		throw err;
	}
}

/*

This function finds `globalDesiredPath` given `localDesiredPath` and `currentPath`

Diagram:

...basePath/
└── void/
	├── ...currentPath/ (defined globally)
	└── ...localDesiredPath/ (defined locally)

*/
function findDesiredPathFromLocalPath(localDesiredPath, currentPath) {

	// walk upwards until currentPath + localDesiredPath exists
	while (!doesPathExist(path.join(currentPath, localDesiredPath))) {
		const parentDir = path.dirname(currentPath);

		if (parentDir === currentPath) {
			return undefined;
		}

		currentPath = parentDir;
	}

	// return the `globallyDesiredPath`
	const globalDesiredPath = path.join(currentPath, localDesiredPath)
	return globalDesiredPath;
}

// hack to refresh styles automatically
function saveStylesFile() {
	setTimeout(() => {
		try {
			const pathToCssFile = findDesiredPathFromLocalPath('./src/vs/workbench/contrib/raccoon/browser/react/src2/styles.css', __dirname);

			if (pathToCssFile === undefined) {
				console.error('[scope-tailwind] Error finding styles.css');
				return;
			}

			// Or re-write with the same content:
			const content = fs.readFileSync(pathToCssFile, 'utf8');
			fs.writeFileSync(pathToCssFile, content, 'utf8');
			console.log('[scope-tailwind] Force-saved styles.css');
		} catch (err) {
			console.error('[scope-tailwind] Error saving styles.css:', err);
		}
	}, 6000);
}

const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');

if (isWatch) {
	// this just builds it if it doesn't exist instead of waiting for the watcher to trigger
	// Check if src2/ exists; if not, do an initial scope-tailwind build
	if (!fs.existsSync('src2')) {
		try {
			console.log('🔨 Running initial scope-tailwind build to create src2 folder...');
			execSync(
				`${scopeTailwindCmd} ./src -o src2/ -s raccoon-scope -c styles.css -p ""`,
				{ stdio: 'inherit' }
			);
			console.log('✅ src2/ created successfully.');
		} catch (err) {
			console.error('❌ Error running initial scope-tailwind build:', err);
			process.exit(1);
		}
	}

	// Watch mode
	const scopeTailwindWatcher = spawn(nodemonCmd, [

		'--watch', 'src',
		'--ext', 'ts,tsx,css',
		'--exec',
		`${scopeTailwindCmd} ./src -o src2/ -s raccoon-scope -c styles.css -p ""`
	]);

	const tsupWatcher = spawn(tsupCmd, [

		'--watch'
	], { env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });

	scopeTailwindWatcher.stdout.on('data', (data) => {
		console.log(`[scope-tailwind] ${data}`);
		// If the output mentions "styles.css", trigger the save:
		if (data.toString().includes('styles.css')) {
			saveStylesFile();
		}
	});

	scopeTailwindWatcher.stderr.on('data', (data) => {
		console.error(`[scope-tailwind] ${data}`);
	});

	// Handle tsup watcher output
	tsupWatcher.stdout.on('data', (data) => {
		console.log(`[tsup] ${data}`);
	});

	tsupWatcher.stderr.on('data', (data) => {
		console.error(`[tsup] ${data}`);
	});

	// Handle process termination
	process.on('SIGINT', () => {
		scopeTailwindWatcher.kill();
		tsupWatcher.kill();
		process.exit();
	});

	console.log('🔄 Watchers started! Press Ctrl+C to stop both watchers.');
} else {
	// Build mode
	console.log('📦 Building...');

	// Run scope-tailwind once
	execSync(`${scopeTailwindCmd} ./src -o src2/ -s raccoon-scope -c styles.css -p ""`, { stdio: 'inherit' });

	// Run tsup once
	execSync(`${tsupCmd}`, { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } });

	console.log('✅ Build complete!');
}

