
export interface ScreenshotJob {
  id: string;
  imagesDir: string;
  localDataDir: string;
  masterDataDir: string;
}


export interface ScreenshotCompare {
  mismatch: number;
  id?: string;
  desc?: string;
  expectedImage?: string;
  receivedImage?: string;
  isScreenshotCompare: boolean;
}


export interface ScreenshotData {
  id: string;
  desc: string;
  image: string;
  device?: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  hasTouch?: boolean;
  isLandscape?: boolean;
  isMobile?: boolean;
  mediaType?: string;
}


export interface ScreenshotConnector {
  deleteSnapshot(snapshotId: string): Promise<any>;
  getData(): Promise<any>;
  getMasterSnapshot(): Promise<any>;
  getSnapshot(snapshotId: string): Promise<any>;
  postSnapshot(snapshot: any): Promise<void>;
  readImage(imageFileName: string): any;
  setMasterSnapshot(snapshotId: string): Promise<any>;
}


export interface ScreenshotServer {
  start(connector: ScreenshotConnector): Promise<void>;
  getRootUrl(): string;
  getCompareUrl(snapshotIdA: string, snapshotIdB: string): string;
  getSnapshotUrl(snapshotId: string): string;
  isListening(): boolean;
}


export interface ScreenshotOptions {
  /**
   * When true, takes a screenshot of the full scrollable page.
   * @default false
   */
  fullPage?: boolean;

  /**
   * An object which specifies clipping region of the page.
   */
  clip?: ScreenshotBoundingBox;

  /**
   * Hides default white background and allows capturing screenshots with transparency.
   * @default false
   */
  omitBackground?: boolean;
}


export interface ScreenshotBoundingBox {
  /**
   * The x-coordinate of top-left corner.
   */
  x: number;

  /**
   * The y-coordinate of top-left corner.
   */
  y: number;

  /**
   * The width in pixels.
   */
  width: number;

  /**
   * The height in pixels.
   */
  height: number;
}
