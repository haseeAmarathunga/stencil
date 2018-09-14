import * as d from '../declarations';
import * as fs from 'fs';
import * as path from 'path';


export class ScreenshotConnector implements d.ScreenshotConnector {
  rootDirName = 'screenshots';
  dataDirName = 'data';
  appDataFileName = 'data.json';
  imagesDirName = 'images';
  snapshotDataDirName = 'snapshots';
  addGitIgnore = true;

  results: d.E2ESnapshot;
  rootDir: string;
  dataDir: string;
  imagesDir: string;
  snapshotDataDir: string;

  async postSnapshot(results: d.E2ESnapshot) {
    this.results = results;

    await this.createDirs();
    await this.updateImages();
    await this.updateSnapshotData();
    await this.updateData();
  }

  async createDirs() {
    await this.createRootDir();
    await this.createDataDir();
    await this.createImagesDir();
    await this.createSnapshotDataDir();
  }

  async createRootDir() {
    this.rootDir = path.join(this.results.appRootDir, this.rootDirName);
    await this.mkDir(this.rootDir);

    if (this.addGitIgnore) {
      const gitIgnoreFilePath = path.join(this.rootDir, '.gitignore');
      await this.writeFile(gitIgnoreFilePath, '*');
    }
  }

  async createDataDir() {
    this.dataDir = path.join(this.rootDir, this.dataDirName);
    await this.mkDir(this.dataDir);
  }

  async createSnapshotDataDir() {
    this.snapshotDataDir = path.join(this.dataDir, this.snapshotDataDirName);
    await this.mkDir(this.snapshotDataDir);
  }

  async createImagesDir() {
    this.imagesDir = path.join(this.rootDir, this.imagesDirName);
    await this.mkDir(this.imagesDir);
  }

  async updateImages() {
    const copyTasks = this.results.screenshots.map(async screenshot => {
      const srcPath = path.join(this.results.imagesDir, screenshot.image);
      const destPath = path.join(this.imagesDir, screenshot.image);

      const imageExists = await this.hasAccess(destPath);
      if (!imageExists) {
        await this.copyFile(srcPath, destPath);
      }
    });

    await Promise.all(copyTasks);
  }

  async updateSnapshotData() {
    const snapshotJsonFileName = `${this.results.id}.json`;
    const snapshotJsonFilePath = path.join(this.snapshotDataDir, snapshotJsonFileName);

    const snapshotData: d.E2ESnapshot = {
      id: this.results.id,
      msg: this.results.msg || '',
      repoUrl: this.results.repoUrl || '',
      timestamp: this.results.timestamp,
      screenshots: this.results.screenshots.map(screenshot => {
        return {
          id: screenshot.id,
          desc: screenshot.desc,
          image: screenshot.image
        };
      })
    };

    await this.writeFile(snapshotJsonFilePath, JSON.stringify(snapshotData));
  }

  async updateData() {
    try {
      const previousAppData = await this.getData();

      previousAppData.snapshots = previousAppData.snapshots || [];
      previousAppData.snapshots.push(formatSnapshotData(this.results));
      previousAppData.snapshots.sort(sortSnapshots);

      await this.writeData(previousAppData);

    } catch (e) {
      await this.generateData();
    }
  }

  async getData() {
    const appDataJsonFilePath = path.join(this.dataDir, this.appDataFileName);
    let data: d.E2EData = null;

    try {
      const dataContent = await this.readFile(appDataJsonFilePath);
      data = JSON.parse(dataContent);

    } catch (e) {}

    return data;
  }

  async writeData(data: d.E2EData) {
    const appDataJsonFilePath = path.join(this.dataDir, this.appDataFileName);

    try {
      await this.writeFile(appDataJsonFilePath, JSON.stringify(data));

    } catch (e) {}

    return data;
  }

  async generateData() {
    const snapshots = await this.getAllSnapshotData();

    const appData: d.E2EData = {
      masterSnapshotId: null,
      snapshots: snapshots.map(formatSnapshotData)
    };

    appData.snapshots.sort(sortSnapshots);

    const appDataJsonFilePath = path.join(this.dataDir, this.appDataFileName);

    if (appData.snapshots.length > 0) {
      appData.masterSnapshotId = appData.snapshots[0].id;
    }

    await this.writeFile(appDataJsonFilePath, JSON.stringify(appData));
  }

  async getAllSnapshotData() {
    const snapshotJsonFileNames = await this.getSnapshotFileNames();

    const snapshotIds = snapshotJsonFileNames.filter(fileName => {
      return (fileName.endsWith('.json'));
    }).map(snapshotJsonFileName => {
      return snapshotJsonFileName.split('.')[0];
    });

    const snapshots = snapshotIds.map(async snapshotId => {
      return await this.getSnapshot(snapshotId);
    });

    return Promise.all(snapshots);
  }

  async getSnapshotFileNames() {
    return await this.readDir(this.snapshotDataDir);
  }

  async getMasterSnapshot() {
    let masterSnapshot: d.E2ESnapshot = null;

    try {
      const data = await this.getData();
      if (data && data.masterSnapshotId) {
        masterSnapshot = await this.getSnapshot(data.masterSnapshotId);
      }

    } catch (e) {}

    return masterSnapshot;
  }

  async getSnapshot(snapshotId: string) {
    let snapshotJsonContent: string;
    const snapshotJsonFileName = `${snapshotId}.json`;

    const cachedFilePath = path.join(this.results.dataDir, snapshotJsonFileName);

    try {
      snapshotJsonContent = await readFile(cachedFilePath);

    } catch (e) {
      const snapshotJsonFilePath = path.join(this.snapshotDataDir, snapshotJsonFileName);

      snapshotJsonContent = await this.readFile(snapshotJsonFilePath);

      await this.writeFile(cachedFilePath, snapshotJsonContent);
    }

    const parsedData: d.E2ESnapshot = JSON.parse(snapshotJsonContent);
    return parsedData;
  }

  async deleteSnapshot(snapshotId: string) {
    const data = await this.getData();

    if (data && data.snapshots) {
      if (data.masterSnapshotId === snapshotId) {
        return data;
      }

      data.snapshots = data.snapshots.filter(s => s.id !== snapshotId);
    }

    return this.writeData(data);
  }

  async setMasterSnapshot(snapshotId: string) {
    const data = await this.getData();

    if (data) {
      if (!data.snapshots.some(s => s.id === snapshotId)) {
        return data;
      }
      data.masterSnapshotId = snapshotId;
    }

    return this.writeData(data);
  }

  readImage(imageFileName: string) {
    const imageFilePath = path.join(this.imagesDir, imageFileName);
    return fs.createReadStream(imageFilePath);
  }

  readDir(dirPath: string) {
    return readDir(dirPath);
  }

  hasAccess(filePath: string) {
    return hasAccess(filePath);
  }

  copyFile(src: string, dest: string) {
    return copyFile(src, dest);
  }

  writeFile(filePath: string, data: any) {
    return writeFile(filePath, data);
  }

  readFile(filePath: string) {
    return readFile(filePath);
  }

  mkDir(dirPath: string) {
    return mkDir(dirPath);
  }

  stat(itemPath: string) {
    return stat(itemPath);
  }

  deleteFile(filePath: string) {
    return deleteFile(filePath);
  }

  deleteDir(dirPath: string) {
    return deleteDir(dirPath);
  }

}

function formatSnapshotData(results: d.E2ESnapshot) {
  const snapshotData: d.E2ESnapshot = {
    id: results.id,
    msg: results.msg || '',
    repoUrl: results.repoUrl || '',
    timestamp: results.timestamp
  };
  return snapshotData;
}

function sortSnapshots(a: d.E2ESnapshot, b: d.E2ESnapshot) {
  if (a.timestamp > b.timestamp) return -1;
  if (a.timestamp < b.timestamp) return 1;
  return 0;
}

async function readDir(dirPath: string) {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

async function hasAccess(filePath: string) {
  return new Promise<boolean>(resolve => {
    fs.access(filePath, (err: any) => resolve(!err));
  });
}

async function copyFile(src: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const rd = fs.createReadStream(src);
    rd.on('error', reject);

    const wr = fs.createWriteStream(dest);
    wr.on('error', reject);
    wr.on('close', resolve);
    rd.pipe(wr);
  });
}

async function writeFile(filePath: string, data: any) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, data, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function readFile(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function stat(itemPath: string) {
  return new Promise<{ isFile: boolean; isDirectory: boolean }>((resolve, reject) => {
    fs.stat(itemPath, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory()
        });
      }
    });
  });
}

async function mkDir(dirPath: string) {
  return new Promise<void>(resolve => {
    fs.mkdir(dirPath, () => resolve());
  });
}

async function deleteFile(filePath: string) {
  return new Promise<void>(resolve => {
    fs.unlink(filePath, () => resolve());
  });
}

async function deleteDir(dirPath: string) {
  return new Promise<void>(resolve => {
    fs.rmdir(dirPath, () => resolve());
  });
}
