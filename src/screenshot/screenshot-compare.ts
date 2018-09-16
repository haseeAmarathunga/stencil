import * as d from '../declarations';
import { getMismatchValue } from './pixel-match';
import { readScreenshotData, writeScreenshotData, writeScreenshotImage } from './screenshot-fs';
import crypto from 'crypto';
import path from 'path';


export async function compareScreenshot(emulateConfig: d.EmulateConfig, screenshotBuild: d.ScreenshotBuild, screenshotBuf: Buffer, uniqueDescription: string, threshold: number) {
  const hash = crypto.createHash('md5').update(screenshotBuf).digest('hex');
  const imageName = `${hash}.png`;
  const imagePath = path.join(screenshotBuild.imagesDirPath, imageName);

  // write our image
  await writeScreenshotImage(imagePath, screenshotBuf);

  // create the data we'll be saving as json
  // the "id" is what we use as a key to compare to sets of data
  // the "image" is a hash of the image file name
  // and what we can use to quickly see if they're identical or not
  const localData: d.ScreenshotData = {
    id: getScreenshotId(emulateConfig, uniqueDescription),
    desc: uniqueDescription,
    image: imageName,
    device: emulateConfig.device,
    width: emulateConfig.width,
    height: emulateConfig.height,
    deviceScaleFactor: emulateConfig.deviceScaleFactor,
    hasTouch: emulateConfig.hasTouch,
    isLandscape: emulateConfig.isLandscape,
    isMobile: emulateConfig.isMobile,
    mediaType: emulateConfig.mediaType
  };

  // this is the data that'll get used by the jest matcher
  const compare: d.ScreenshotCompare = {
    id: localData.id,
    desc: localData.desc,
    expectedImage: null,
    receivedImage: localData.image,
    mismatch: 0,
    url: null,
    isScreenshotCompare: true
  };

  if (screenshotBuild.updateMaster) {
    // this data is going to become the master data
    // so no need to compare with previous versions

    // write the screenshot data as the master data
    await writeScreenshotData(screenshotBuild.masterDirPath, localData);

    return compare;
  }

  const masterData = await readScreenshotData(screenshotBuild.masterDirPath, localData.id);
  if (!masterData) {
    // there is no master data so nothing to compare it with
    // so let's just write the screenshot data as the master data
    await Promise.all([
      writeScreenshotData(screenshotBuild.masterDirPath, localData),
      writeScreenshotData(screenshotBuild.localDirPath, localData)
    ]);

    return compare;
  }

  // set that the master data image is the image we're expecting
  compare.expectedImage = masterData.image;

  compare.url = getCompareUrl(screenshotBuild.compareUrlTemplate, compare.expectedImage, compare.receivedImage);

  // compare if the image hashes are the same
  if (compare.expectedImage === compare.receivedImage) {
    // turns out the images are identical
    // cuz they have the exact same hashed filename
    await writeScreenshotData(screenshotBuild.localDirPath, localData);

    return compare;
  }

  // compare the two images pixel by pixel to
  // figure out a mismatch value
  compare.mismatch = await getMismatchValue(
    screenshotBuild.imagesDirPath,
    compare.expectedImage,
    compare.receivedImage,
    localData.width,
    localData.height,
    threshold
  );

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


function getCompareUrl(template: string, expectImage: string, receivedImage: string) {
  if (typeof template !== 'string') {
    return null;
  }
  return template.replace('<EXPECT>', expectImage).replace('<RECEIVED>', receivedImage);
}
