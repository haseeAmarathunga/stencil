import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';


export async function getMismatchValue(imagesDir: string, masterImage: string, localImage: string, width: number, height: number) {
  const images = await Promise.all([
    readImage(imagesDir, masterImage),
    readImage(imagesDir, localImage)
  ]);

  const mismatchValue = pixelmatch(images[0], images[1], null, width, height, {
    threshold: 0.1,
    includeAA: false
  });

  return mismatchValue;
}


function readImage(imagesDir: string, image: string) {
  return new Promise<Buffer>(resolve => {
    const filePath = path.join(imagesDir, image);

    const rs = fs.createReadStream(filePath);

    rs.pipe(new PNG()).on('parsed', resolve);
  });
}
