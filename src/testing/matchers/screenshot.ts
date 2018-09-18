import * as d from '../../declarations';


export function toMatchScreenshot(compare: d.ScreenshotCompare, opts: d.MatchScreenshotOptions = {}) {
  if (!compare) {
    throw new Error(`expect toMatchScreenshot value is null`);
  }

  if (typeof (compare as any).then === 'function') {
    throw new Error(`expect(compare).toMatchScreenshot() must be a resolved value, not a promise, before it can be tested`);
  }

  if (typeof compare.mismatchedPixels !== 'number') {
    throw new Error(`expect toMatchScreenshot() value is not a screenshot compare`);
  }

  const device = compare.device || compare.userAgent;

  if (typeof opts.mismatchedPixels === 'number') {
    if (opts.mismatchedPixels < 0) {
      throw new Error(`expect toMatchScreenshot() mismatchedPixels value must be a value of 0 or greater`);
    }

    return {
      message: () => `${device}: screenshot has "${compare.mismatchedPixels}" mismatched pixels for "${compare.desc}", but expect less than "${opts.mismatchedPixels}" mismatched pixels`,
      pass: (compare.mismatchedPixels < opts.mismatchedPixels),
    };
  }

  if (typeof opts.mismatchedRatio === 'number') {
    if (opts.mismatchedRatio < 0 || opts.mismatchedRatio > 1) {
      throw new Error(`expect toMatchScreenshot() mismatchedRatio value must be a value between 0 and 1`);
    }
  } else {
    opts.mismatchedRatio = DEFAULT_MISMATCHED_PIXELS;
  }

  return {
    message: () => `${device}: screenshot has a mismatch ratio of "${compare.mismatchedRatio}" for "${compare.desc}", but expected ratio to be less than "${opts.mismatchedRatio}"`,
    pass: (compare.mismatchedRatio < opts.mismatchedRatio),
  };
}

const DEFAULT_MISMATCHED_PIXELS = 0.01;
