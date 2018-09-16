import * as d from '../../declarations';


export function toMatchScreenshot(compare: d.ScreenshotCompare, opts: d.MatchScreenshotOptions = {}) {
  if (!compare) {
    throw new Error(`expect toMatchScreenshot value is null`);
  }

  if (typeof (compare as any).then === 'function') {
    throw new Error(`expect(compare).toMatchScreenshot() must be a resolved value, not a promise, before it can be tested`);
  }

  if (!compare.isScreenshotCompare) {
    throw new Error(`expect toMatchScreenshot() value is not a screenshot compare`);
  }

  if (typeof opts.mismatch === 'number') {
    if (opts.mismatch < 0 || opts.mismatch > 1) {
      throw new Error(`expect toMatchScreenshot() mismatch value must be a value between 0 and 1`);
    }
  } else {
    opts.mismatch = DEFAULT_MISMATCH;
  }

  const pass = (compare.mismatch <= opts.mismatch);

  return {
    message: () => `screenshot comparison has a mismatch of ${compare.mismatch} for screenshot "${compare.desc}", ${compare.url}`,
    pass: pass,
  };
}

const DEFAULT_MISMATCH = 0.01;
