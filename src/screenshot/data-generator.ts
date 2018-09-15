import * as d from '../declarations';


export async function completeE2EScreenshots(config: d.Config, env: d.E2EProcessEnv, results: d.E2ESnapshot) {
  try {
    const snapshot = await consolidateData(config, results);

    const connector = await runScreenshotConnector(config, env, snapshot);

    const server = await runScreenshotServer(config, env, connector);

    if (snapshot && connector && server && server.isListening()) {
      await openScreenshotCompareApp(config, connector, server, snapshot);
    }

  } catch (e) {
    config.logger.error(`completeE2EScreenshots, ${e}`);
  }
}


async function openScreenshotCompareApp(config: d.Config, connector: d.ScreenshotConnector, server: d.ScreenshotServer, snapshot: d.E2ESnapshot) {
  let url: string;

  const masterSnapshot = await connector.getMasterSnapshot();
  if (masterSnapshot) {

    if (masterSnapshot.id !== snapshot.id) {
      url = server.getCompareUrl(masterSnapshot.id, snapshot.id);
    } else {
      url = server.getSnapshotUrl(snapshot.id);
    }

  } else {
    url = server.getRootUrl();
  }

  if (url) {
    config.logger.info(`screenshots: ${config.logger.magenta(url)}`);
    config.sys.open(url);
  }
}


async function consolidateData(config: d.Config, results: d.E2ESnapshot) {
  const snapshotDataJsonDir = config.sys.path.join(results.dataDir, results.id);

  const snapshot: d.E2ESnapshot = {
    id: results.id,
    appRootDir: config.rootDir,
    packageDir: config.sys.compiler.packageDir,
    imagesDir: results.imagesDir,
    dataDir: results.dataDir,
    timestamp: results.timestamp,
    compilerVersion: config.sys.compiler.version,
    screenshots: []
  };

  const screenshotJsonFiles = await config.sys.fs.readdir(snapshotDataJsonDir);

  const unlinks: Promise<void>[] = [];

  screenshotJsonFiles.forEach(screenshotJsonFileName => {
    const screenshotJsonFilePath = config.sys.path.join(snapshotDataJsonDir, screenshotJsonFileName);

    const screenshotData: d.ScreenshotData = JSON.parse(config.sys.fs.readFileSync(screenshotJsonFilePath));

    snapshot.screenshots.push(screenshotData);

    unlinks.push(config.sys.fs.unlink(screenshotJsonFilePath));
  });

  await Promise.all(unlinks);

  await config.sys.fs.rmdir(snapshotDataJsonDir);

  snapshot.screenshots.sort((a, b) => {
    if (a.desc < b.desc) return -1;
    if (a.desc > b.desc) return 1;
    return 0;
  });

  const snapshotDataJsonFileName = `${results.id}.json`;
  const snapshotDataJsonFilePath = config.sys.path.join(results.dataDir, snapshotDataJsonFileName);
  await config.sys.fs.writeFile(snapshotDataJsonFilePath, JSON.stringify(snapshot));

  return snapshot;
}


async function runScreenshotConnector(config: d.Config, env: d.E2EProcessEnv, snapshot: d.E2ESnapshot) {
  let connector: d.ScreenshotConnector = null;

  let connectorModulePath = env.STENCIL_SCREENSHOT_CONNECTOR;

  if (typeof connectorModulePath !== 'string' || !connectorModulePath) {
    connectorModulePath = config.sys.path.join(
      config.sys.compiler.packageDir, 'screenshot', 'screenshot.connector.default.js'
    );
  }

  try {
    const ScreenshotConnector = require(connectorModulePath);

    connector = new ScreenshotConnector();

    if (typeof connector.postSnapshot !== 'function') {
      throw new Error(`connector missing postSnapshot()`);
    }

    snapshot.channel = config.flags.channel || 'local';

    const timespan = config.logger.createTimeSpan(`saving screenshot data, channel: ${snapshot.channel}`);

    await connector.postSnapshot(snapshot);

    timespan.finish(`saving screenshot data finished`);

  } catch (e) {
    config.logger.error(`error running screenshot connector: ${connectorModulePath}, ${e}`);
    connector = null;
  }

  return connector;
}


async function runScreenshotServer(config: d.Config, env: d.E2EProcessEnv, connector: d.ScreenshotConnector) {
  let server: d.ScreenshotServer = null;

  if (!connector || !config.flags.compare) {
    return server;
  }

  let serverModulePath = env.STENCIL_SCREENSHOT_SERVER;

  if (typeof serverModulePath !== 'string' || !serverModulePath) {
    serverModulePath = config.sys.path.join(
      config.sys.compiler.packageDir, 'screenshot', 'screenshot.server.default.js'
    );
  }

  try {
    const ScreenshotServer = require(serverModulePath);

    server = new ScreenshotServer();

    await server.start(connector);

  } catch (e) {
    config.logger.error(`error running screenshot server: ${serverModulePath}, ${e}`);
  }

  return server;
}
