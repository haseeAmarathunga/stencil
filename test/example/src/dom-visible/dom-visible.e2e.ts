import { newE2EPage } from '../../../../dist/testing';


describe('dom visible e2e tests', () => {

  it('isVisible()', async () => {
    const page = await newE2EPage({ html: `
      <dom-visible></dom-visible>
    `});

    const article = await page.find('article');
    let isVisible = await article.isVisible();
    expect(isVisible).toBe(false);

    const elm = await page.find('button');
    await elm.click();

    isVisible = await article.isVisible();
    expect(isVisible).toBe(true);
  });

  it('isVisible()', async () => {
    const page = await newE2EPage({ html: `
      <dom-visible></dom-visible>
    `});

    const article = await page.find('article');

    const untilVisible = article.waitUntilVisible();

    let isVisible = await article.isVisible();
    expect(isVisible).toBe(false);

    const elm = await page.find('button');
    await elm.click();

    await untilVisible;

    isVisible = await article.isVisible();
    expect(isVisible).toBe(true);
  });

});
