import type { Renderer } from "../main";

export function getRenderer(): Renderer {
  return async function accuweather(options) {
    const { browser, articleUrl, outPath, page: pageOptions } = options;

    const page = await browser.newPage();
    try {
      await page.setJavaScriptEnabled(true);
      await page.setUserAgent(CHROME_ANDROID_USER_AGENT);

      await page.goto(String(articleUrl), { waitUntil: "networkidle0" });

      const title = await page.$eval("meta[property='og:title']", (el) => el.content);
      const pubDate = new Date();

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
  };
}

const CSS = String.raw`
  .more-cta-links, .breadcrumbs, .footer-legalese
  {
    display: none !important;
  }

  .header-placeholder.has-adhesion
  {
    height: 48px !important;
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
`;

const CHROME_ANDROID_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 11; Z832 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Mobile Safari/537.36";
