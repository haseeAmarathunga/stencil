
export interface ScreenshotConnector {
  init(opts: ScreenshotConnectorOptions): Promise<void>;
  complete(): Promise<void>;
  toJson(): string;
}

export interface ScreenshotConnectorOptions {
  rootDir: string;
  buildId?: string;
  updateMaster?: boolean;
}

export interface ScreenshotBuild {
  buildId: string;
  rootDir: string;
  screenshotDirPath: string;
  imagesDirPath: string;
  masterDirPath: string;
  localDirPath: string;
  updateMaster: boolean;
  compareUrlTemplate: string;
}


export interface ScreenshotCompare {
  mismatch: number;
  id?: string;
  desc?: string;
  expectedImage?: string;
  receivedImage?: string;
  url?: string;
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

  /**
   * Matching threshold, ranges from `0` to 1. Smaller values make the comparison
   * more sensitive.
   * @default 0.1
   */
  threshold?: number;
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
