import type { RenderOptions } from "../main";

export async function render(options: RenderOptions): Promise<void> {
  const { browser, articleUrl, outPath, page: pageOptions } = options;

  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);

    articleUrl.host = "old.reddit.com";
    articleUrl.search = "?limit=500";

    await page.goto(String(articleUrl), { waitUntil: "networkidle0" });

    const over18Button = await page.$("button[name='over18'][value='yes']");
    if (over18Button) {
      over18Button.click();
      await page.waitForNetworkIdle();
    }

    const title = await page.$eval("meta[property='og:title']", (el) => el.content);
    const pubDate = new Date(await page.$eval("time", (el) => el.dateTime));

    await page.addStyleTag({ content: CSS });

    await page.$$eval(".morecomments .gray", (els) => {
      els.forEach((el) => el.previousSibling?.remove());
    });

    await page.$$eval("div.comment", (els) => {
      els.forEach((el) => el.style.cssText = "border: 0 !important");
    });

    await page.$$eval("span.md-spoiler-text", (els) => {
      els.forEach((el) => el.classList.add("revealed"));
    });

    await page.pdf({
      width: pageOptions.width,
      height: pageOptions.height,
      scale: 1.5,
      path: outPath({ title, pubDate }),
    });
  } finally {
    await page.close();
  }
}

const CSS = String.raw`
  #header, section.infobar,
  .side, .buttons, .arrow
  {
    display: none !important;
  }

  .content, .commentarea
  {
    margin: 0 !important;
  }

  .comment
  {
    padding-right: 0 !important;
  }

  .child
  {
    padding-top: 5px !important;
    margin-left: 5px !important;
    border-left: solid 2px gray !important;
  }

  body, .comment
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
