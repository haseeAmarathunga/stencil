import * as d from '../declarations';
import * as fs from './screenshot-fs';
import * as path from 'path';
import { URL } from 'url';
import { normalizePath } from '../compiler/util';


export class ScreenshotConnector implements d.ScreenshotConnector {
  private screenshotDirName = 'screenshot';
  private masterDirName = 'master';
  private localDirName = 'local';
  private compareAppFileName = 'compare.html';
  private imagesDirName = 'images';
  private logger: d.Logger;
  private buildId: string;
  private buildMessage: string;
  private rootDir: string;
  private compareAppDir: string;
  private screenshotDirPath: string;
  private masterDirPath: string;
  private localDirPath: string;
  private imagesDirPath: string;
  private updateMaster: boolean;
  private compareUrl: string;
  private masterBuild: d.ScreenshotBuild;
  private localBuild: d.ScreenshotBuild;
  private localBuildPath: string;

  async initBuild(opts: d.ScreenshotConnectorOptions) {
    this.logger = opts.logger;

    this.buildId = opts.buildId;
    if (typeof this.buildId !== 'string') {
      this.buildId = createBuildId();
    }
    this.buildMessage = typeof opts.buildMessage === 'string' ? opts.buildMessage.trim() : '';

    this.logger.debug(`screenshot build: ${this.buildId}${this.buildMessage ? ', ' + this.buildMessage : ''}`);

    this.rootDir = opts.rootDir;
    this.compareAppDir = opts.compareAppDir;
    this.updateMaster = !!opts.updateMaster;

    if (typeof opts.screenshotDirName === 'string') {
      this.screenshotDirName = opts.screenshotDirName;
    }

    if (typeof opts.masterDirName === 'string') {
      this.masterDirName = opts.masterDirName;
    }

    if (typeof opts.localDirName === 'string') {
      this.localDirName = opts.localDirName;
    }

    if (typeof opts.compareAppFileName === 'string') {
      this.compareAppFileName = opts.compareAppFileName;
    }

    if (typeof opts.imagesDirName === 'string') {
      this.imagesDirName = opts.imagesDirName;
    }

    this.screenshotDirPath = path.join(this.rootDir, this.screenshotDirName);
    this.imagesDirPath = path.join(this.screenshotDirPath, this.imagesDirName);
    this.masterDirPath = path.join(this.screenshotDirPath, this.masterDirName);
    this.localDirPath = path.join(this.screenshotDirPath, this.localDirName);

    this.logger.debug(`screenshotDirPath: ${this.screenshotDirPath}`);
    this.logger.debug(`imagesDirPath: ${this.imagesDirPath}`);
    this.logger.debug(`masterDirPath: ${this.masterDirPath}`);
    this.logger.debug(`localDirPath: ${this.localDirPath}`);

    await fs.mkDir(this.screenshotDirPath);

    await Promise.all([
      fs.mkDir(this.imagesDirPath),
      fs.mkDir(this.masterDirPath),
      fs.mkDir(this.localDirPath)
    ]);

    const fsTasks: Promise<any>[] = [];

    if (this.updateMaster) {
      fsTasks.push(fs.emptyDir(this.masterDirPath));
    }

    fsTasks.push(fs.emptyDir(this.localDirPath));

    const gitIgnorePath = path.join(this.screenshotDirPath, '.gitignore');
    const gitIgnoreExists = await fs.fileExists(gitIgnorePath);
    if (!gitIgnoreExists) {
      const content: string[] = [];

      if (opts.gitIgnoreImages !== false) {
        content.push(this.imagesDirName);
      }
      if (opts.gitIgnoreLocal !== false) {
        content.push(this.localDirName);
      }
      if (opts.gitIgnoreCompareApp !== false) {
        content.push(this.compareAppFileName);
      }

      if (content.length) {
        content.unshift(`# only master screenshot data should be committed`);
        fsTasks.push(fs.writeFile(gitIgnorePath, content.join('\n')));
      }
    }

    const compareAppFilePath = path.join(this.screenshotDirPath, this.compareAppFileName);
    const url = new URL(`file://${compareAppFilePath}`);
    this.compareUrl = url.href;

    this.logger.debug(`compareUrl: ${this.compareUrl}`);

    await Promise.all(fsTasks);
  }

  async completeBuild() {
    const masterFilePaths = (await fs.readDir(this.masterDirPath)).map(f => path.join(this.masterDirPath, f)).filter(f => f.endsWith('.json'));
    const masterScreenshots = await Promise.all(masterFilePaths.map(async f => JSON.parse(await fs.readFile(f)) as d.ScreenshotData));

    sortScreenshots(masterScreenshots);

    this.masterBuild = {
      id: 'master',
      message: '',
      screenshots: masterScreenshots
    };

    const localFilePaths = (await fs.readDir(this.localDirPath)).map(f => path.join(this.localDirPath, f)).filter(f => f.endsWith('.json'));
    const localScreenshots = await Promise.all(localFilePaths.map(async f => JSON.parse(await fs.readFile(f)) as d.ScreenshotData));

    sortScreenshots(localScreenshots);

    this.localBuild = {
      id: this.buildId,
      message: this.buildMessage,
      screenshots: localScreenshots
    };

    await fs.emptyDir(this.localDirPath);

    this.localBuildPath = path.join(this.localDirPath, `${this.localBuild.id}.json`);

    await fs.writeFile(this.localBuildPath, JSON.stringify(this.localBuild, null, 2));
  }

  async publishBuild() {
    const appUrl = normalizePath(path.relative(this.screenshotDirPath, this.compareAppDir));
    const imagesUrl = normalizePath(path.relative(this.screenshotDirPath, this.imagesDirPath));

    const html = createLocalCompare(appUrl, imagesUrl, this.masterBuild, this.localBuild);

    const compareAppPath = path.join(this.screenshotDirPath, this.compareAppFileName);
    await fs.writeFile(compareAppPath, html);
  }

  getComparisonSummaryUrl() {
    return this.compareUrl;
  }

  getTotalScreenshotImages() {
    return this.localBuild.screenshots.length;
  }

  toJson() {
    const screenshotBuild: d.ScreenshotBuildData = {
      id: this.buildId,
      rootDir: this.rootDir,
      screenshotDirPath: this.screenshotDirPath,
      imagesDirPath: this.imagesDirPath,
      masterDirPath: this.masterDirPath,
      localDirPath: this.localDirPath,
      updateMaster: this.updateMaster,
      compareUrlTemplate: this.compareUrl
    };

    return JSON.stringify(screenshotBuild);
  }

}


function createBuildId() {
  const d = new Date();

  let fmDt = (d.getUTCFullYear() + '');
  fmDt += ('0' + (d.getUTCMonth() + 1)).slice(-2);
  fmDt += ('0' + d.getUTCDate()).slice(-2);
  fmDt += ('0' + d.getUTCHours()).slice(-2);
  fmDt += ('0' + d.getUTCMinutes()).slice(-2);
  fmDt += ('0' + d.getUTCSeconds()).slice(-2);

  return fmDt;
}


function createLocalCompare(appUrl: string, imagesUrl: string, masterBuild: d.ScreenshotBuild, localBuild: d.ScreenshotBuild) {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="utf-8">
  <title>Stencil Screenshot Comparison</title>
  <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="x-ua-compatible" content="IE=Edge">
  <link href="${appUrl}/build/app.css" rel="stylesheet">
  <script src="${appUrl}/build/app.js"></script>
</head>
<body>
  <ion-app></ion-app>
  <script>
    (function() {
      var compare = document.createElement('screenshot-compare');
      compare.imagesUrl = '${imagesUrl}/';
      compare.buildA = ${JSON.stringify(masterBuild)};
      compare.buildB = ${JSON.stringify(localBuild)};
      compare.className = 'ion-page';
      document.querySelector('ion-app').appendChild(compare);
    })();
  </script>
</body>
</html>`;
}


function sortScreenshots(screenshots: d.ScreenshotData[]) {
  screenshots.sort((a, b) => {
    if (a.desc.toLowerCase() < b.desc.toLowerCase()) return -1;
    if (a.desc.toLowerCase() > b.desc.toLowerCase()) return 1;
    if (a.device.toLowerCase() < b.device.toLowerCase()) return -1;
    if (a.device.toLowerCase() > b.device.toLowerCase()) return 1;
    if (a.width < b.width) return -1;
    if (a.width > b.width) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
