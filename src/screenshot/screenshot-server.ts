import * as d from '../declarations';
import { findClosestOpenPort } from '../dev-server/find-closest-port';
import { normalizePath } from '../compiler/util';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';


export class ScreenshotServer implements d.ScreenshotServer {
  private _url: string = null;
  private _isListening = false;

  async start(connector: d.ScreenshotConnector) {
    const host = 'localhost';
    let port = 5543;

    port = await findClosestOpenPort(host, port);

    const reqHandler = createRequestHandler(connector);

    const server = http.createServer(reqHandler);

    process.once('SIGINT', () => {
      this._isListening = false;
      server.close();
    });

    server.listen(port, host);

    this._isListening = true;

    this._url = `http://${host}:${port}/`;
  }

  getRootUrl() {
    return this._url;
  }

  getCompareUrl(snapshotIdA: string, snapshotIdB: string) {
    return this._url + `${snapshotIdA}/${snapshotIdB}`;
  }

  getSnapshotUrl(snapshotId: string) {
    return this._url + snapshotId;
  }

  isListening() {
    return this._isListening;
  }

}


function createRequestHandler(connector: d.ScreenshotConnector) {
  return function(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.url === '') {
      res.writeHead(302, { 'location': '/' });
      return res.end();
    }

    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.query.delete_snapshot) {
      deleteSnapshot(connector, parsedUrl.query.delete_snapshot as string, res);
      return;
    }

    if (parsedUrl.query.set_master_snapshot) {
      setMasterSnapshot(connector, parsedUrl.query.set_master_snapshot as string, res);
      return;
    }

    let pathname = parsedUrl.pathname;
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }

    if (pathname.endsWith('.png')) {
      loadScreenshotImage(connector, pathname, res);
      return;
    }

    if (pathname.endsWith('.json')) {
      loadJson(connector, pathname, res);
      return;
    }

    loadFile(pathname, res);
  };
}


async function deleteSnapshot(connector: d.ScreenshotConnector, snapshotId: string, res: http.ServerResponse) {
  const data = await connector.deleteSnapshot(snapshotId);

  res.writeHead(200, Object.assign({'Content-Type': 'application/json'}, DEFAULT_HEADERS));
  res.write(JSON.stringify(data));
  res.end();
}


async function setMasterSnapshot(connector: d.ScreenshotConnector, snapshotId: string, res: http.ServerResponse) {
  const data = await connector.setMasterSnapshot(snapshotId);

  res.writeHead(200, Object.assign({'Content-Type': 'application/json'}, DEFAULT_HEADERS));
  res.write(JSON.stringify(data));
  res.end();
}


function loadScreenshotImage(connector: d.ScreenshotConnector, pathname: string, res: http.ServerResponse) {
  try {
    const paths = pathname.split('/');
    const fileName = paths[paths.length - 1];

    const readStream = connector.readImage(fileName);
    readStream.on('error', (err: any) => {
      error(err + '', res);
    });

    res.writeHead(200, Object.assign({'Content-Type': 'image/png'}, DEFAULT_HEADERS));

    readStream.pipe(res);

  } catch (e) {
    error(e + '', res);
  }
}


async function loadJson(connector: d.ScreenshotConnector, pathname: string, res: http.ServerResponse) {
  let data: any;
  const paths = pathname.split('/');
  const fileName = paths[paths.length - 1];

  if (fileName === 'data.json') {
    data = await connector.getData();
  } else {
    data = await connector.getSnapshot(fileName.split('.')[0]);
  }

  res.writeHead(200, Object.assign({'Content-Type': 'application/json'}, DEFAULT_HEADERS));
  res.write(JSON.stringify(data));
  res.end();
}


function loadFile(pathname: string, res: http.ServerResponse) {
  if (pathname.endsWith('.css') || pathname.endsWith('.js')) {
    let contentType: string;
    if (pathname.endsWith('.css')) {
      contentType = 'text/css';
    } else if (pathname.endsWith('.js')) {
      contentType = 'application/javascript';
    }

    const appFile = normalizePath(path.join(__dirname, '..', '..', 'screenshot', 'app', pathname));

    res.writeHead(200, Object.assign({'Content-Type': contentType}, DEFAULT_HEADERS));

    try {
      const rs = fs.createReadStream(appFile);
      rs.on('error', err => {
        error(err + '', res);
      });
      rs.pipe(res);
    } catch (e) {
      error(e + '', res);
    }

  } else if (pathname.includes('.')) {
    error('invalid path', res);

  } else {
    const appFile = normalizePath(path.join(__dirname, '..', '..', 'screenshot', 'app', 'index.html'));

    res.writeHead(200, Object.assign({'Content-Type': 'text/html'}, DEFAULT_HEADERS));

    const rs = fs.createReadStream(appFile).pipe(res);
    rs.on('error', err => {
      error(err && err.message, res);
    });
  }
}

function error(msg: string, res: http.ServerResponse) {
  res.writeHead(404, Object.assign({'Content-Type': 'text/plain'}, DEFAULT_HEADERS));
  res.write(msg);
  res.end();
}


const DEFAULT_HEADERS: d.DevResponseHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Expires': '0',
  'X-Powered-By': 'Stencil Screenshot Server',
  'Access-Control-Allow-Origin': '*'
};
