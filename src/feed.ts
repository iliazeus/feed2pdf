import got from "got";
import { xml2js } from "xml-js";

export type Feed = RssFeed | AtomFeed;
export type FeedEntry = RssFeedEntry | AtomFeedEntry;

export interface RssFeed {
  rss: Array<{
    channel: Array<{
      item: Array<RssFeedEntry>;
    }>;
  }>;
}

export interface RssFeedEntry {
  title: Array<{ _text: string }>;
  link: Array<{ _text: string }>;
}

export interface AtomFeed {
  feed: Array<{
    entry: Array<AtomFeedEntry>;
  }>;
}

export interface AtomFeedEntry {
  title: Array<{ _text: string }>;
  link: Array<{ _attributes: { href: string } }>;
}

export async function fetchFeed(url: URL): Promise<Feed> {
  const feedText = await got(url).text();
  const feedObject = xml2js(feedText, { compact: true, alwaysArray: true, cdataKey: "_text" });
  return feedObject as Feed;
}
