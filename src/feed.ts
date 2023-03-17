import got from "got";
import { xml2js } from "xml-js";

export interface Rss {
  rss: {
    channel: {
      item: RssItem[];
    };
  };
}

export interface RssItem {
  title: { _text: string };
  link: { _text: string };
}

export async function fetchRss(url: URL): Promise<Rss> {
  const rssText = await got(url).text();
  const rssObject = xml2js(rssText, { compact: true, cdataKey: "_text" });
  return rssObject as Rss;
}
