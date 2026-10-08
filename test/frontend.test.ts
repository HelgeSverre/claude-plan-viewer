import { test, expect, describe } from "bun:test";
import {
  escapeRegex,
  pluralize,
  abbreviateHome,
} from "../src/client/utils/strings.ts";
import {
  linkifyWikilinks,
  stripFrontmatter,
} from "../src/client/utils/markdown.ts";
import { formatDate, formatSize } from "../src/client/utils/formatters.ts";

describe("escapeRegex", () => {
  test("escapes every regex metacharacter", () => {
    const input = "a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o";
    expect(new RegExp(escapeRegex(input)).test(input)).toBe(true);
    expect(new RegExp(`^${escapeRegex("(x)")}$`).test("(x)")).toBe(true);
  });
});

describe("pluralize", () => {
  test("uses the singular only for one", () => {
    expect(pluralize(0, "plan")).toBe("0 plans");
    expect(pluralize(1, "plan")).toBe("1 plan");
    expect(pluralize(1, "memory")).toBe("1 memory");
    expect(pluralize(4, "memory")).toBe("4 memories");
  });
});

describe("abbreviateHome", () => {
  test("shortens macOS and Linux home directories", () => {
    expect(abbreviateHome("/Users/helge/code/app")).toBe("~/code/app");
    expect(abbreviateHome("/home/dev/app")).toBe("~/app");
    expect(abbreviateHome("/Users/helge")).toBe("~");
  });

  test("leaves other paths alone", () => {
    expect(abbreviateHome("/private/tmp/x")).toBe("/private/tmp/x");
    expect(abbreviateHome("/Users-like/x")).toBe("/Users-like/x");
  });
});

describe("stripFrontmatter", () => {
  test("removes a leading frontmatter block", () => {
    expect(stripFrontmatter("---\nname: x\ntype: user\n---\nBody")).toBe(
      "Body",
    );
    expect(stripFrontmatter("---\r\nname: x\r\n---\r\nBody")).toBe("Body");
  });

  test("keeps content without frontmatter, including later rules", () => {
    expect(stripFrontmatter("# Title\n\n---\n\nText")).toBe(
      "# Title\n\n---\n\nText",
    );
  });
});

describe("linkifyWikilinks", () => {
  test("rewrites wikilinks as memory: links", () => {
    expect(linkifyWikilinks("See [[testing-strategy]].")).toBe(
      "See [testing-strategy](memory:testing-strategy).",
    );
  });

  test("uses the alias as text and drops heading anchors", () => {
    expect(linkifyWikilinks("[[notes|My notes]] and [[deploy#Steps]]")).toBe(
      "[My notes](memory:notes) and [deploy](memory:deploy)",
    );
  });

  test("encodes targets for use in a URL", () => {
    expect(linkifyWikilinks("[[two words]]")).toBe(
      "[two words](memory:two%20words)",
    );
  });

  test("leaves fenced and inline code untouched", () => {
    const md = "```md\n[[fenced]]\n```\nUse `[[inline]]` or [[real]]";
    expect(linkifyWikilinks(md)).toBe(
      "```md\n[[fenced]]\n```\nUse `[[inline]]` or [real](memory:real)",
    );
  });
});

describe("formatSize", () => {
  test("formats bytes and kilobytes", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.0 KB");
  });
});

describe("formatDate", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  test("shows relative times for the last week", () => {
    expect(formatDate(ago(10_000))).toBe("just now");
    expect(formatDate(ago(5 * 60_000))).toBe("5m ago");
    expect(formatDate(ago(3 * 3_600_000))).toBe("3h ago");
    expect(formatDate(ago(2 * 86_400_000))).toBe("2d ago");
  });

  test("shows the year for dates in other years", () => {
    expect(formatDate("2020-03-15T12:00:00.000Z")).toBe("Mar 15, 2020");
  });
});
