import { program } from "commander";
import pkg from "../package.json";

import { main } from "./main";
import * as renderers from "./renderers";

program.showHelpAfterError();

program.name(pkg.name).version(pkg.version).description(pkg.description);

program
  .argument("<feed-url>", "url to an RSS feed")
  .argument("<out-dir>", "path to directory where to put PDF files")
  .option("--browser <executable-path>", "path to browser executable to use", "/usr/bin/chromium")
  .option("-w --page-width <width>", "page width", "758px")
  .option("-h --page-height <height>", "page height", "1024px")
  .option("-j --concurrency <number>", "maximum concurrency", "3")
  .action(
    async (
      feedUrl: string,
      outDir: string,
      options: {
        browser: string;
        pageWidth: string;
        pageHeight: string;
        concurrency: string;
      }
    ) => {
      await main({
        log: console.log,
        feedUrl: new URL(feedUrl),
        outDir,
        concurrency: Number(options.concurrency),
        browser: {
          executablePath: options.browser,
        },
        page: {
          width: options.pageWidth,
          height: options.pageHeight,
        },
        renderer: (url) => {
          const hostname = url.hostname;
          const href = url.href.toLowerCase();

          if (hostname === "habr.com") return renderers.habr();

          if (href.includes("reddit.com/r/askreddit/comments")) return renderers.reddit();

          if (href.includes("reddit.com/r/askhistorians/comments")) {
            return renderers.reddit({
              hideDeletedComments: true,
              hideCommentsFrom: ["AutoModerator"],
            });
          }

          if (hostname === "reddit.com" || hostname === "old.reddit.com") {
            return renderers.reddit();
          }

          return renderers.generic();
        },
      });
    }
  );

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = error.exitCode ?? 1;
});
