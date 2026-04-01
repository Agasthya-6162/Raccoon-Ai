import fs from 'fs';

const filePath = 'c:\\Users\\pc\\Desktop\\devonz-editor-desktop-main\\devonz-editor-desktop-main\\resources\\win32\\inno-raccoon.bmp';

try {
  const buffer = fs.readFileSync(filePath);
  // BMP header: 0-1 'BM', 2-5 size, 18-21 width, 22-25 height
  const width = buffer.readInt32LE(18);
  const height = buffer.readInt32LE(22);
  console.log(`Dimensions: ${width}x${height}`);
} catch (err) {
  console.error(err);
}
