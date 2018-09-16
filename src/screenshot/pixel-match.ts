import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';


export async function getMismatchValue(imageDir: string, masterImageName: string, localImageName: string, width: number, height: number, threshold: number) {
  const images = await Promise.all([
    readImage(imageDir, masterImageName),
    readImage(imageDir, localImageName)
  ]);

  if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
    threshold = DEFAULT_THRESHOLD;
  }

  // get the number of different pixels
  const diff = pixelmatch(images[0], images[1], null, width, height, {
    threshold: threshold,
    includeAA: false
  });

  return (diff / (width * height));
}


function readImage(imagesDir: string, image: string) {
  return new Promise<Buffer>(resolve => {
    const filePath = path.join(imagesDir, image);

    const rs = fs.createReadStream(filePath);

    rs.pipe(new PNG()).on('parsed', resolve);
  });
}


const DEFAULT_THRESHOLD = 0.1;
