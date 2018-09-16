import * as d from '../../declarations';
import { compareScreenshot } from '../../screenshot/screenshot-compare';
import * as pd from './puppeteer-declarations';
import * as puppeteer from 'puppeteer';


export function initPageScreenshot(page: pd.E2EPageInternal) {
  if ((process.env as d.E2EProcessEnv).__STENCIL_SCREENSHOT__ === 'true') {
    page.compareScreenshot = compareE2EScreenshot.bind(page, page);

  } else {
    // screen shot not enabled, so just skip over all the logic
    page.compareScreenshot = async () => {
      const compare: d.ScreenshotCompare = {
        mismatch: 0,
        isScreenshotCompare: true,
        desc: ''
      };
      return compare;
    };
  }
}


export async function compareE2EScreenshot(page: pd.E2EPageInternal, uniqueDescription: string, opts: d.ScreenshotOptions = {}) {
  const env = (process.env) as d.E2EProcessEnv;

  if (typeof env.__STENCIL_EMULATE__ !== 'string') {
    throw new Error(`compareScreenshot, missing screenshot emulate env var`);
  }

  if (typeof env.__STENCIL_SCREENSHOT_BUILD__ !== 'string') {
    throw new Error(`compareScreenshot, missing screen build env var`);
  }

  const screenshotOpts = createPuppeteerScreenshopOptions(opts);
  const screenshotBuf = await page.screenshot(screenshotOpts);

  const emulateConfig = JSON.parse(env.__STENCIL_EMULATE__) as d.EmulateConfig;

  const screenshotBuild = JSON.parse(env.__STENCIL_SCREENSHOT_BUILD__) as d.ScreenshotBuild;

  return compareScreenshot(emulateConfig, screenshotBuild, screenshotBuf, uniqueDescription, opts.threshold);
}


function createPuppeteerScreenshopOptions(opts: d.ScreenshotOptions) {
  const puppeteerOpts: puppeteer.ScreenshotOptions = {
    type: 'png',
    fullPage: opts.fullPage,
    omitBackground: opts.omitBackground,
    encoding: 'binary'
  };

  if (opts.clip) {
    puppeteerOpts.clip = {
      x: opts.clip.x,
      y: opts.clip.y,
      width: opts.clip.width,
      height: opts.clip.height
    };
  }

  return puppeteerOpts;
}
