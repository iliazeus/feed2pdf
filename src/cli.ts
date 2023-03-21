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
  .option("--only <name>", "only use renderer <name>")
  .action(
    async (
      feedUrl: string,
      outDir: string,
      options: {
        browser: string;
        pageWidth: string;
        pageHeight: string;
        concurrency: string;
        only?: string;
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
          let renderer = null;

          const hostname = url.hostname;
          const href = url.href.toLowerCase();

          if (hostname === "habr.com") {
            renderer = { name: "habr", render: renderers.habr() };
          } else if (href.includes("reddit.com/r/askreddit/comments")) {
            renderer = { name: "askreddit", render: renderers.reddit() };
          } else if (href.includes("reddit.com/r/askhistorians/comments")) {
            renderer = {
              name: "askhistorians",
              render: renderers.reddit({
                hideDeletedComments: true,
                hideCommentsFrom: ["AutoModerator"],
              }),
            };
          } else if (hostname === "reddit.com" || hostname === "old.reddit.com") {
            renderer = { name: "reddit", render: renderers.reddit() };
          } else if (hostname === "accuweather.com") {
            renderer = { name: "accuweather", render: renderers.accuweather() };
          } else {
            renderer = { name: "other", render: renderers.generic() };
          }

          if (options.only && renderer?.name !== options.only) renderer = null;

          return renderer;
        },
      });
    }
  );

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = error.exitCode ?? 1;
});
