import { spawn } from 'child_process';
import fs from 'fs';

const logFile = fs.createWriteStream('debug_build.log');
const gulp = spawn('node', ['--max-old-space-size=8192', './node_modules/gulp/bin/gulp.js', 'vscode-win32-x64-ci'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
});

gulp.stdout.pipe(logFile);
gulp.stderr.pipe(logFile);

gulp.on('close', (code) => {
    console.log(`Gulp exited with code ${code}`);
    logFile.end();
});
