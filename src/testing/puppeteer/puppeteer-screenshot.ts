import * as d from '../../declarations';
import { writeE2EScreenshot } from '../../screenshot/data-generator';
import * as pd from './puppeteer-declarations';
import * as puppeteer from 'puppeteer';


export function initTestPageScreenshot(page: pd.TestPage) {
  if ((process.env as d.E2EProcessEnv).__STENCIL_SCREENSHOTS__ === 'true') {
    page.e2eScreenshot = screenshot.bind(page, page);

  } else {
    // screen shot not enabled, so don't bother creating all this
    page.e2eScreenshot = () => Promise.resolve();
  }
}


export async function screenshot(page: pd.TestPage, uniqueDescription: string, opts: d.TestScreenshotOptions = {}) {
  const screenshot = await page.screenshot(createPuppeteerScreenshopOptions(opts));

  await writeE2EScreenshot(screenshot, uniqueDescription);
}


function createPuppeteerScreenshopOptions(opts: d.TestScreenshotOptions) {
  const puppeteerOpts: puppeteer.ScreenshotOptions = {
    type: 'png',
    fullPage: opts.fullPage,
    omitBackground: opts.omitBackground
  };

  if (opts.clip) {
    puppeteerOpts.clip = {
      x: opts.clip.x,
      y: opts.clip.y,
      width: opts.clip.width,
      height: opts.clip.height
    };
  }
  (puppeteerOpts as any).encoding = 'binary';

  return puppeteerOpts;
}
