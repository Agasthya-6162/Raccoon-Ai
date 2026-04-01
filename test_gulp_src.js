import gulp from 'gulp';
import path from 'path';

console.log('Testing gulp.src("out-vscode/**")...');
gulp.src('out-vscode/**', { base: '.' })
    .on('data', (file) => {
        // console.log('Found:', file.path);
    })
    .on('error', (err) => {
        console.error('Gulp error in out-vscode:', err);
        process.exit(1);
    })
    .on('end', () => {
        console.log('Finished out-vscode scan.');
        
        console.log('Testing gulp.src(".build/extensions/**")...');
        gulp.src('.build/extensions/**', { base: '.', dot: true })
            .on('data', (file) => {
                // console.log('Found:', file.path);
            })
            .on('error', (err) => {
                console.error('Gulp error in .build/extensions:', err);
                process.exit(1);
            })
            .on('end', () => {
                console.log('Finished .build/extensions scan.');
                process.exit(0);
            });
    });
