const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('out')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/pc/Desktop/devonz-editor-desktop-main/devonz-editor-desktop-main/src');
let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Safely replacing Devonz
    content = content.replace(/Devonz Editor/g, "Raccoon AI");
    content = content.replace(/Devonz/g, "Raccoon");
    content = content.replace(/devonz/g, "raccoon");
    
    // Safely replacing Void (capitalized is usually safe as it points to the brand)
    content = content.replace(/Void Editor/g, "Raccoon AI");
    content = content.replace(/'Void'/g, "'Raccoon AI'");
    content = content.replace(/"Void"/g, '"Raccoon AI"');
    content = content.replace(/Void:/g, "Raccoon AI:");
    content = content.replace(/Void Error/g, "Raccoon AI Error");
    content = content.replace(/Welcome to Void/g, "Welcome to Raccoon AI");
    content = content.replace(/void Onboarding/ig, "Raccoon Onboarding");

    // Replace the internal path 'contrib/void' to 'contrib/raccoon'
    content = content.replace(/contrib\/void/g, "contrib/raccoon");
    content = content.replace(/vs\\workbench\\contrib\\void/g, "vs\\workbench\\contrib\\raccoon");
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
        updatedCount++;
    }
});

console.log(`Finished updating ${updatedCount} files.`);
