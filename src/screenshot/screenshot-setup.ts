import * as d from '../declarations';


export async function setupScreenshotJob(config: d.Config) {
  const id = getScreenshotJobId();

  const tmpDir = config.sys.details.tmpDir;

  // verify we've got a images dir
  const imagesDir = config.sys.path.join(tmpDir, IMAGES_CACHE_DIR);
  try {
    await config.sys.fs.mkdir(imagesDir);
  } catch (e) {}

  // verify we've got a data dir
  const tmpDataDir = config.sys.path.join(tmpDir, DATA_CACHE_DIR);
  try {
    await config.sys.fs.mkdir(tmpDataDir);
  } catch (e) {}

  // verify we've got a data dir to write to for the current local build
  const localDataDir = config.sys.path.join(tmpDataDir, id);
  try {
    await config.sys.fs.mkdir(localDataDir);
  } catch (e) {}

  // verify we've got app's screenshot dir
  try {
    await config.sys.fs.mkdir(config.testing.screenshotDir);
  } catch (e) {}

  // verify we've got app's screenshot master data dir
  const masterDataDir = config.sys.path.join(config.testing.screenshotDir, MASTER_DATA_DIR);
  try {
    await config.sys.fs.mkdir(masterDataDir);
  } catch (e) {}

  if (config.flags.updateScreenshot) {
    // updating all screenshots in the master data
    // so clean out the current master data
    await emptyMasterScreenshots(config, masterDataDir);
  }

  const screenshotJob: d.ScreenshotJob = {
    id,
    imagesDir,
    localDataDir,
    masterDataDir
  };

  config.logger.debug(`screenshot job started: ${screenshotJob.id}`);

  return screenshotJob;
}


async function emptyMasterScreenshots(config: d.Config, masterDataDir: string) {
  const files = await config.sys.fs.readdir(masterDataDir);

  const promises = files.map(async fileName => {
    const filePath = config.sys.path.join(masterDataDir, fileName);
    await config.sys.fs.unlink(filePath);
  });

  await Promise.all(promises);
}


export async function completeScreenshotJob(config: d.Config, screenshotJob: d.ScreenshotJob) {

  config.logger.debug(`screenshot job completed: ${screenshotJob.id}`);
}


function getScreenshotJobId() {
  const d = new Date();

  let fmDt = (d.getUTCFullYear() + '');
  fmDt += ('0' + (d.getUTCMonth() + 1)).slice(-2);
  fmDt += ('0' + d.getUTCDate()).slice(-2);
  fmDt += ('0' + d.getUTCHours()).slice(-2);
  fmDt += ('0' + d.getUTCMinutes()).slice(-2);
  fmDt += ('0' + d.getUTCSeconds()).slice(-2);

  return fmDt;
}


const IMAGES_CACHE_DIR = 'stencil-screenshot-images';
const DATA_CACHE_DIR = 'stencil-screenshot-data';
const MASTER_DATA_DIR = 'master';
