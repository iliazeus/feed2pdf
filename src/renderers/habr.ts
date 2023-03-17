import type { Page } from "puppeteer-core";
import type { PageOptions, RenderOptions } from "../main";

export async function render(options: RenderOptions): Promise<void> {
  const { browser, pdftk, articleUrl, outPath, page: pageOptions } = options;

  const page = await browser.newPage();
  try {
    await page.goto(String(articleUrl));

    const title = await page.$eval("meta[property='og:title']", (el) => el.content);
    const pubDate = new Date(await page.$eval("time", (el) => el.dateTime));

    const articlePdf = await renderPage(page, {
      pageOptions,
      css: ARTICLE_CSS,
    });

    const commentsUrl = new URL("comments", articleUrl);
    await page.goto(String(commentsUrl));

    const commentsPdf = await renderPage(page, {
      pageOptions,
      css: COMMENTS_CSS,
    });

    await pdftk
      .input({ A: articlePdf, B: commentsPdf })
      .cat("A B")
      .output(outPath({ pubDate, title }));
  } finally {
    await page.close();
  }
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

  return await page.pdf({
    width: options.pageOptions.width,
    height: options.pageOptions.height,
    scale: 1.35,
  });
}

const ARTICLE_CSS = String.raw`
  .tm-feature, .tm-project-block,
  .tm-header, .tm-footer,
  section,
  .tm-user-info__userpic,
  button
  {
    display: none !important;
  }

  body
  {
    background: white !important;
    color: black !important;
    font-family: Noto Serif !important;
  }

  pre, pre code
  {
    white-space: pre-wrap !important;
    word-break: break-all !important;
  }
`;

const COMMENTS_CSS = String.raw`
.tm-feature, .tm-project-block,
  .tm-header, .tm-footer,
  section:not(.tm-comment-thread),
  .tm-user-info__userpic,
  .tm-comment-thread__circle,
  button
  {
    display: none !important;
  }

  body
  {
    background: white !important;
    color: black !important;
    font-family: Noto Serif !important;
  }

  pre, pre code
  {
    white-space: pre-wrap !important;
    word-break: break-all !important;
  }
`;
