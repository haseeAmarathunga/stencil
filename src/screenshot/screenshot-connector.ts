import * as d from '../declarations';
import * as fs from './screenshot-fs';
import * as path from 'path';


export class ScreenshotConnector implements d.ScreenshotConnector {
  screenshotDirName = 'screenshot';
  masterDirName = 'master';
  localDirName = 'local';
  imagesDirName = 'images';
  gitIgnoreImages = true;
  gitIgnoreLocal = true;

  buildId: string;
  rootDir: string;
  screenshotDirPath: string;
  masterDirPath: string;
  imagesDirPath: string;
  localDirPath: string;
  updateMaster: boolean;
  compareUrlTemplate: string = null;

  async init(opts: d.ScreenshotConnectorOptions) {
    this.buildId = opts.buildId;
    if (typeof this.buildId !== 'string') {
      this.buildId = createBuildId();
    }

    this.rootDir = opts.rootDir;
    this.updateMaster = !!opts.updateMaster;

    this.screenshotDirPath = path.join(this.rootDir, this.screenshotDirName);
    this.imagesDirPath = path.join(this.screenshotDirPath, this.imagesDirName);
    this.masterDirPath = path.join(this.screenshotDirPath, this.masterDirName);
    this.localDirPath = path.join(this.screenshotDirPath, this.localDirName);

    if (this.updateMaster) {
      await fs.emptyDir(this.masterDirPath);
    }

    await fs.mkDir(this.screenshotDirPath);
    await fs.mkDir(this.imagesDirPath);
    await fs.mkDir(this.masterDirPath);
    await fs.mkDir(this.localDirPath);

    if (this.gitIgnoreImages) {
      await fs.addDirectoryGitIngore(this.imagesDirPath);
    }

    if (this.gitIgnoreLocal) {
      await fs.addDirectoryGitIngore(this.localDirPath);
    }
  }

  complete() {
    return Promise.resolve();
  }

  toJson() {
    const screenshotBuild: d.ScreenshotBuild = {
      buildId: this.buildId,
      rootDir: this.rootDir,
      screenshotDirPath: this.screenshotDirPath,
      imagesDirPath: this.imagesDirPath,
      masterDirPath: this.masterDirPath,
      localDirPath: this.localDirPath,
      updateMaster: this.updateMaster,
      compareUrlTemplate: this.compareUrlTemplate
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
