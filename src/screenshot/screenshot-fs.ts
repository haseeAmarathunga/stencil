import * as d from '../declarations';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';


export async function writeScreenshotImage(imagesDir: string, screenshotBuf: Buffer) {
  const hash = crypto.createHash('md5').update(screenshotBuf).digest('hex');

  const imageName = `${hash}.png`;
  const imagePath = path.join(imagesDir, imageName);

  const imageExists = await fileExists(imagePath);
  if (!imageExists) {
    await writeFile(imagePath, screenshotBuf);
  }

  return imageName;
}


export async function writeScreenshotData(dataDir: string, screenshotData: d.ScreenshotData) {
  const fileName = `${screenshotData.id}.json`;
  const filePath = path.join(dataDir, fileName);
  const content = JSON.stringify(screenshotData, null, 2);
  await writeFile(filePath, content);
}


export async function readMasterScreenshotData(masterDataDir: string, screenshotId: string) {
  let rtn: d.ScreenshotData = null;

  try {
    const dataFilePath = getDataFilePath(masterDataDir, screenshotId);

    const dataContent = await readFile(dataFilePath);

    rtn = JSON.parse(dataContent);

  } catch (e) {}

  return rtn;
}


function getDataFilePath(dataDir: string, screenshotId: string) {
  return path.join(dataDir, `${screenshotId}.json`);
}


export function fileExists(filePath: string) {
  return new Promise<boolean>(resolve => {
    fs.access(filePath, (err: any) => resolve(!err));
  });
}


function readFile(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err: any, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}


export function writeFile(filePath: string, data: any) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, data, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
