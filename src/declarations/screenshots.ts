import * as d from '.';


export interface ScreenshotConnector {
  initBuild(opts: ScreenshotConnectorOptions): Promise<void>;
  completeBuild(): Promise<void>;
  publishBuild(): Promise<void>;
  getComparisonSummaryUrl(): string;
  getTotalScreenshotImages(): number;
  toJson(): string;
}


export interface ScreenshotConnectorOptions {
  rootDir: string;
  cacheDir: string;
  compareAppDir: string;
  logger: d.Logger;
  screenshotDirName?: string;
  masterDirName?: string;
  localDirName?: string;
  compareAppFileName?: string;
  imagesDirName?: string;
  buildId: string;
  buildMessage: string;
  updateMaster?: boolean;
  gitIgnoreImages?: boolean;
  gitIgnoreLocal?: boolean;
  gitIgnoreCompareApp?: boolean;
}


export interface ScreenshotBuildData {
  id: string;
  rootDir: string;
  cacheDir: string;
  screenshotDirPath: string;
  imagesDirPath: string;
  masterDirPath: string;
  localDirPath: string;
  updateMaster: boolean;
  compareUrlTemplate: string;
}


export interface ScreenshotBuild {
  id: string;
  message: string;
  screenshots: ScreenshotData[];
}


export interface ScreenshotData {
  id: string;
  desc: string;
  image: string;
  device?: string;
  userAgent?: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  physicalWidth?: number;
  physicalHeight?: number;
  hasTouch?: boolean;
  isLandscape?: boolean;
  isMobile?: boolean;
  mediaType?: string;
}


export interface ScreenshotCompare {
  mismatchedPixels: number;
  mismatchedRatio: number;
  id?: string;
  desc?: string;
  expectedImage?: string;
  receivedImage?: string;
  url?: string;
  device?: string;
  userAgent?: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  physicalWidth?: number;
  physicalHeight?: number;
  hasTouch?: boolean;
  isLandscape?: boolean;
  isMobile?: boolean;
  mediaType?: string;
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
