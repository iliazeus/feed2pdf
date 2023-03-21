import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

import makeQueue from "queue";
import puppeteer from "puppeteer-core";
import type { Browser, LaunchOptions as BrowserOptions } from "puppeteer-core";
import { Rss, RssItem, fetchRss } from "./feed";
import pdftk from "node-pdftk";
import slugifyBase from "slugify";

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
) => DispatcherResult<{ name: string; render: Renderer }>;

export interface Options {
  feedUrl: URL;
  rootDir: string;
  renderer: RendererDispatcher;
  page: PageOptions;
  browser: BrowserOptions;
  concurrency: number;
  log: (...args: unknown[]) => void;
}

export async function main(options: Options): Promise<void> {
  const {
    feedUrl,
    rootDir,
    renderer: getRenderer,
    page: pageOptions,
    browser: browserOptions,
    concurrency,
    log,
  } = options;

  await fs.mkdir(rootDir, { recursive: true });
  await mergeInto(rootDir, path.join(rootDir, "old"));

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

        const outDir = path.join(rootDir, renderer.name);
        await fs.mkdir(outDir, { recursive: true });

        const outPath = (a: { pubDate: Date; title: string }) => {
          const pubDate = a.pubDate.toISOString().split("T")[0];
          const title = slugify(a.title);
          return path.join(outDir, `${pubDate}-${title}.pdf`);
        };

        await renderer.render({
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

async function mergeInto(sourceDir: string, targetDir: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });

  for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (path.resolve(sourceDir, entry.name) === path.resolve(targetDir)) continue;
      await mergeInto(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
    } else if (entry.isFile()) {
      await fs.rename(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
    }
  }

  await fs.rmdir(sourceDir).catch((err) => (err.code === "ENOTEMPTY" ? null : Promise.reject(err)));
}

export function slugify(s: string): string {
  return slugifyBase(s, { lower: true })
    .replaceAll(/[*/:<>?\\|]/g, "")
    .replaceAll(/[ьЬ]/g, "");
}
