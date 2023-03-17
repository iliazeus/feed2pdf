import * as path from "node:path";
import * as fs from "node:fs/promises";

import puppeteer from "puppeteer-core";
import type { Browser, LaunchOptions as BrowserOptions } from "puppeteer-core";
import { Rss, RssItem, fetchRss } from "./feed";
import pdftk from "node-pdftk";
import slugify from "slugify";

export interface PageOptions {
  width: string;
  height: string;
}

export interface RenderOptions {
  browser: Browser;
  pdftk: typeof pdftk;
  articleUrl: URL;
  outPath: (args: { pubDate: Date; title: string }) => string;
  page: PageOptions;
}

export type Renderer = (options: RenderOptions) => Promise<void>;

export type DispatcherResult<T> = T | null | undefined | Promise<T | null | undefined>;

export type RendererDispatcher = (
  articleUrl: URL,
  item: RssItem,
  feed: Rss
) => DispatcherResult<Renderer>;

export interface Options {
  feedUrl: URL;
  outDir: string;
  renderer: RendererDispatcher;
  page: PageOptions;
  browser: BrowserOptions;
}

export async function main(options: Options): Promise<void> {
  const {
    feedUrl,
    outDir,
    renderer: getRenderer,
    page: pageOptions,
    browser: browserOptions,
  } = options;

  await fs.mkdir(outDir, { recursive: true });

  const feed = await fetchRss(feedUrl);

  const browser = await puppeteer.launch(browserOptions);

  pdftk.configure({ tempDir: path.join(outDir, ".pdftk-tmp") });

  try {
    for (const item of feed.rss.channel.item) {
      const articleUrl = new URL(item.link._text);

      const renderer = await getRenderer(articleUrl, item, feed);
      if (!renderer) continue;

      const outPath = (a: { pubDate: Date; title: string }) => {
        const pubDate = a.pubDate.toISOString().split("T")[0];
        const title = slugify(a.title, { lower: true });
        return path.join(outDir, `${pubDate}-${title}.pdf`);
      };

      await renderer({
        browser,
        pdftk,
        articleUrl,
        outPath,
        page: pageOptions,
      });
    }
  } finally {
    await browser.close();
  }
}
