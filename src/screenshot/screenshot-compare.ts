import * as d from '../declarations';
import { getMismatchedPixels } from './pixel-match';
import { readScreenshotData, writeScreenshotData, writeScreenshotImage } from './screenshot-fs';
import crypto from 'crypto';
import path from 'path';


export async function compareScreenshot(emulateConfig: d.EmulateConfig, screenshotBuild: d.ScreenshotBuildData, screenshotBuf: Buffer, uniqueDescription: string, threshold: number) {
  const hash = crypto.createHash('md5').update(screenshotBuf).digest('hex');
  const localImageName = `${hash}.png`;
  const imagePath = path.join(screenshotBuild.imagesDirPath, localImageName);

  // create the data we'll be saving as json
  // the "id" is what we use as a key to compare to sets of data
  // the "image" is a hash of the image file name
  // and what we can use to quickly see if they're identical or not
  const localData: d.ScreenshotData = {
    id: getScreenshotId(emulateConfig, uniqueDescription),
    desc: uniqueDescription,
    image: localImageName,
    device: emulateConfig.device,
    userAgent: emulateConfig.userAgent,
    width: emulateConfig.width,
    height: emulateConfig.height,
    deviceScaleFactor: emulateConfig.deviceScaleFactor,
    physicalWidth: Math.round(emulateConfig.width * emulateConfig.deviceScaleFactor),
    physicalHeight: Math.round(emulateConfig.height * emulateConfig.deviceScaleFactor),
    hasTouch: emulateConfig.hasTouch,
    isLandscape: emulateConfig.isLandscape,
    isMobile: emulateConfig.isMobile,
    mediaType: emulateConfig.mediaType
  };

  // write the local build data
  await Promise.all([
    writeScreenshotData(screenshotBuild.localDirPath, localData),
    writeScreenshotImage(imagePath, screenshotBuf)
  ]);

  // this is the data that'll get used by the jest matcher
  const compare: d.ScreenshotCompare = {
    id: localData.id,
    desc: localData.desc,
    expectedImage: null,
    receivedImage: localData.image,
    mismatchedPixels: 0,
    mismatchedRatio: 0,
    url: null,
    device: emulateConfig.device,
    userAgent: emulateConfig.userAgent,
    width: emulateConfig.width,
    height: emulateConfig.height,
    deviceScaleFactor: emulateConfig.deviceScaleFactor,
    physicalWidth: localData.physicalWidth,
    physicalHeight: localData.physicalHeight,
    hasTouch: emulateConfig.hasTouch,
    isLandscape: emulateConfig.isLandscape,
    isMobile: emulateConfig.isMobile,
    mediaType: emulateConfig.mediaType
  };

  if (screenshotBuild.updateMaster) {
    // this data is going to become the master data
    // so no need to compare with previous versions
    await writeScreenshotData(screenshotBuild.masterDirPath, localData);
    return compare;
  }

  const masterData = await readScreenshotData(screenshotBuild.masterDirPath, localData.id);
  if (!masterData) {
    // there is no master data so nothing to compare it with
    await writeScreenshotData(screenshotBuild.masterDirPath, localData);
    return compare;
  }

  // set that the master data image is the image we're expecting
  compare.expectedImage = masterData.image;

  // compare only if the image hashes are different
  if (compare.expectedImage !== compare.receivedImage) {
    // compare the two images pixel by pixel to
    // figure out a mismatch value
    compare.mismatchedPixels = await getMismatchedPixels(
      screenshotBuild.cacheDir,
      screenshotBuild.imagesDirPath,
      compare.expectedImage,
      compare.receivedImage,
      compare.physicalWidth,
      compare.physicalHeight,
      threshold
    );
  }

  compare.mismatchedRatio = (compare.mismatchedPixels / (compare.physicalWidth * compare.physicalHeight));

  return compare;
}


function getScreenshotId(emulateConfig: d.EmulateConfig, uniqueDescription: string) {
  const hash = crypto.createHash('md5');

  hash.update(uniqueDescription);

  hash.update(emulateConfig.width.toString());
  hash.update(emulateConfig.height.toString());
  hash.update(emulateConfig.deviceScaleFactor.toString());
  hash.update(emulateConfig.userAgent.toString());
  hash.update(emulateConfig.hasTouch.toString());
  hash.update(emulateConfig.isMobile.toString());

  if (emulateConfig.mediaType != null) {
    hash.update(emulateConfig.mediaType);
  }

  return hash.digest('hex').substr(0, 8).toLowerCase();
}
