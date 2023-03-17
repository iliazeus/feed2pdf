import { program } from "commander";
import pkg from "../package.json";

import { main } from "./main";
import { render as habrRenderer } from "./renderers/habr";

program.showHelpAfterError();

program.name(pkg.name).version(pkg.version).description(pkg.description);

program
  .argument("<feed-url>", "url to an RSS feed")
  .argument("<out-dir>", "path to directory where to put PDF files")
  .option("--browser <executable-path>", "path to browser executable to use", "/usr/bin/chromium")
  .option("-w --page-width <width>", "page width", "758px")
  .option("-h --page-height <height>", "page height", "1024px")
  .action(
    async (
      feedUrl: string,
      outDir: string,
      options: { browser: string; pageWidth: string; pageHeight: string }
    ) => {
      await main({
        feedUrl: new URL(feedUrl),
        outDir,
        browser: {
          executablePath: options.browser,
        },
        page: {
          width: options.pageWidth,
          height: options.pageHeight,
        },
        renderer: (url) => {
          if (url.hostname === "habr.com") return habrRenderer;
          return null;
        },
      });
    }
  );

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = error.exitCode ?? 1;
});
