import type { Page } from "puppeteer-core";
import type { PageOptions, RenderOptions, Renderer } from "../main";

export function getRenderer(): Renderer {
  return async (options) => {
    const { browser, pdftk, articleUrl, outPath, page: pageOptions } = options;

    const page = await browser.newPage();
    try {
      await page.setJavaScriptEnabled(false);

      await page.goto(String(articleUrl), { waitUntil: "networkidle0" });

      const title = await page.$eval("meta[property='og:title']", (el) => el.content);
      const pubDate = new Date(await page.$eval("time", (el) => el.dateTime));

      const articlePdf = await renderPage(page, {
        pageOptions,
        css: CSS,
      });

      const commentsUrl = new URL("comments", page.url());
      await page.goto(String(commentsUrl), { waitUntil: "networkidle0" });

      const commentsPdf = await renderPage(page, {
        pageOptions,
        css: CSS,
      });

      await pdftk
        .input({ A: articlePdf, B: commentsPdf })
        .cat("A B")
        .output(outPath({ pubDate, title }));
    } finally {
      await page.close();
    }
  };
}

async function renderPage(
  page: Page,
  options: {
    pageOptions: PageOptions;
    css: string;
  }
): Promise<Buffer> {
  await page.addStyleTag({ content: options.css });
  await page.$$eval("details", (els) => els.forEach((el) => (el.open = true)));

  await page.waitForTimeout(1000);

  return await page.pdf({
    width: options.pageOptions.width,
    height: options.pageOptions.height,
    scale: 1.35,
  });
}

const CSS = String.raw`
  .tm-header, .tm-page__header,
  .tm-footer, .tm-footer-menu,
  .tm-feature, .tm-project-block,
  .tm-placeholder-courses, .tm-placeholder-promo,
  section:not(.tm-comment-thread),
  .tm-user-info__userpic, .tm-comment-thread__circle, button
  {
    display: none !important;
  }

  .tm-comment-thread__children
  {
    padding-top: 0 !important;
  }

  body
  {
    background: white !important;
    color: black !important;
    font-family: Noto Serif !important;
  }

  p a
  {
    color: black !important;
    text-decoration: underline !important;
  }

  pre, pre code
  {
    white-space: pre-wrap !important;
    word-break: break-all !important;
  }
`;
