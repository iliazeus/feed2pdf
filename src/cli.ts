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
        rootDir: outDir,
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

          if (hostname === "habr.com") return { name: "habr", render: renderers.habr() };

          if (href.includes("reddit.com/r/askreddit/comments")) {
            return { name: "askreddit", render: renderers.reddit() };
          }

          if (href.includes("reddit.com/r/askhistorians/comments")) {
            return {
              name: "askhistorians",
              render: renderers.reddit({
                hideDeletedComments: true,
                hideCommentsFrom: ["AutoModerator"],
              }),
            };
          }

          if (hostname === "reddit.com" || hostname === "old.reddit.com") {
            return { name: "reddit", render: renderers.reddit() };
          }

          return { name: "other", render: renderers.generic() };
        },
      });
    }
  );

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = error.exitCode ?? 1;
});
