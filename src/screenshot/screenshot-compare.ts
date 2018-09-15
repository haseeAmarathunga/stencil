import * as d from '../declarations';
import { getMismatchValue } from './pixel-match';
import { readMasterScreenshotData, writeScreenshotData, writeScreenshotImage } from './screenshot-fs';
import crypto from 'crypto';


export async function compareScreenshot(screenshotBuf: Buffer, emulateConfig: d.EmulateConfig, uniqueDescription: string, imagesDir: string, masterDataDir: string, localDataDir: string, updateMasterScreenshot: boolean) {
  // write the image to the images directory
  // probably a temp directory
  const imageName = await writeScreenshotImage(imagesDir, screenshotBuf);

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
    isScreenshotCompare: true
  };

  if (updateMasterScreenshot) {
    // this data is going to become the master data
    // so no need to compare with previous versions

    // write the screenshot data as the master data
    await writeScreenshotData(masterDataDir, localData);

    return compare;
  }

  const masterData = await readMasterScreenshotData(masterDataDir, localData.id);
  if (!masterData) {
    // there is no master data so nothing to compare it with
    // so let's just write the screenshot data as the master data
    await writeScreenshotData(masterDataDir, localData);

    return compare;
  }

  // set the master data image is the image we're expecting
  compare.expectedImage = masterData.image;

  // compare if the image hashes are the same
  if (compare.expectedImage === compare.receivedImage) {
    // turns out the images are identical
    // cuz they have the exact same hashed filename

    // write the screenshot data as the local data
    await writeScreenshotData(localDataDir, localData);

    return compare;
  }

  // compare the two images pixel by pixel to figure
  // out a mismatch value
  compare.mismatch = await getMismatchValue(
    imagesDir,
    compare.expectedImage,
    compare.receivedImage,
    localData.width,
    localData.height
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
