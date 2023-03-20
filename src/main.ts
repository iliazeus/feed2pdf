import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import makeQueue from "queue";
import puppeteer from "puppeteer-core";
import type { Browser, LaunchOptions as BrowserOptions } from "puppeteer-core";
import { Rss, RssItem, fetchRss } from "./feed";
import pdftk from "node-pdftk";
import slugify from "slugify";

pdftk.configure({ tempDir: os.tmpdir() });

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
  log: (...args: unknown[]) => void;
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
  concurrency: number;
  log: (...args: unknown[]) => void;
}

export async function main(options: Options): Promise<void> {
  const {
    feedUrl,
    outDir,
    renderer: getRenderer,
    page: pageOptions,
    browser: browserOptions,
    concurrency,
    log,
  } = options;

  await fs.mkdir(outDir, { recursive: true });

  const feed = await fetchRss(feedUrl);

  const browser = await puppeteer.launch(browserOptions);

  const queue = makeQueue({ concurrency });
  const errors: unknown[] = [];

  for (const item of feed.rss.channel.item) {
    queue.push(async () => {
      try {
        const articleUrl = new URL(item.link._text);

        const renderer = await getRenderer(articleUrl, item, feed);
        if (!renderer) {
          log(`no renderers for ${articleUrl}`);
          return;
        }

        log(`fetching ${renderer.name} article ${articleUrl}`);

        const hostnameDir = path.join(outDir, articleUrl.hostname);
        await fs.mkdir(hostnameDir, { recursive: true });

        const outPath = (a: { pubDate: Date; title: string }) => {
          const pubDate = a.pubDate.toISOString().split("T")[0];
          const exfatForbiddenChars = /["*\/:<>?\\|]/g;
          const title = slugify(a.title, { lower: true, remove: exfatForbiddenChars });
          return path.join(hostnameDir, `${pubDate}-${title}.pdf`);
        };

        await renderer({
          browser,
          pdftk,
          articleUrl,
          outPath,
          page: pageOptions,
          log: (...args) => log(`[${renderer.name}]`, ...args),
        });
      } catch (error) {
        errors.push(new Error(`error rendering ${item.link._text}`, { cause: error }));
      }
    });
  }

  await new Promise<void>((rs, rj) => queue.start((err) => (err ? rj(err) : rs())));

  await browser.close();

  if (errors.length > 0) {
    throw new AggregateError(errors, "errors were encountered while processing");
  }
}
