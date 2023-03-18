import type { RenderOptions } from "../main";

export async function render(options: RenderOptions): Promise<void> {
  const { browser, articleUrl, outPath, page: pageOptions } = options;

  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);

    await page.goto(String(articleUrl), { waitUntil: "networkidle0" });

    const title = await page.$eval("meta[property='og:title']", (el) => el.content);
    const pubDate = new Date(await page.$eval("time", (el) => el.dateTime));

    await page.addStyleTag({ content: CSS });

    await page.pdf({
      width: pageOptions.width,
      height: pageOptions.height,
      scale: 1.35,
      path: outPath({ title, pubDate }),
    });
  } finally {
    await page.close();
  }
}

const CSS = String.raw`
  body
  {
    background: white !important;
    color: black !important;
    font-family: Noto Serif !important;
  }
`;
