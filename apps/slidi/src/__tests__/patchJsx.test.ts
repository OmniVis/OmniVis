import { describe, it, expect } from "vitest";
import {
  patchIconInCode,
  patchImageSrc,
  patchImageFit,
  patchImageAlt,
  patchLinkHref,
  patchLinkText,
  patchLinkTarget,
  patchTextInElement,
} from "@/lib/patchJsx";

// Minimal slide wrapper matching the format extractSlideBlock expects
function wrapSlide(inner: string, idx = 0) {
  return `export default function Presentation() {
  const [current, setCurrent] = React.useState(0);
  return (
    <div>
      {current === ${idx} && (
        <div key={current}>
          ${inner}
        </div>
      )}
    </div>
  );
}`;
}

describe("patchIconInCode", () => {
  it("replaces a material symbol text node", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    const result = patchIconInCode(code, 0, "star", "rocket_launch");
    expect(result).not.toBeNull();
    expect(result).toContain(">rocket_launch<");
    expect(result).not.toContain(">star<");
  });
  it("returns null when old name is not found", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    expect(patchIconInCode(code, 0, "heart", "star")).toBeNull();
  });
  it("rejects newName with < > characters (injection guard)", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    expect(patchIconInCode(code, 0, "star", '<script>alert(1)</script>')).toBeNull();
  });
  it("patches icon in JSON presentation (walks JSON tree)", () => {
    const data = { slides: [{ content: { visualPrompt: "star", headline: "Hello" } }] };
    const code = JSON.stringify(data, null, 2);
    const result = patchIconInCode(code, 0, "star", "rocket_launch");
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.slides[0].content.visualPrompt).toBe("rocket_launch");
    expect(parsed.slides[0].content.headline).toBe("Hello");
  });
});

describe("patchImageSrc", () => {
  it("replaces src attribute value", () => {
    const code = wrapSlide(`<img src="https://old.com/a.jpg" alt="old" />`);
    const result = patchImageSrc(code, 0, "https://old.com/a.jpg", "https://new.com/b.jpg");
    expect(result).toContain('src="https://new.com/b.jpg"');
    expect(result).not.toContain("https://old.com/a.jpg");
  });
  it("does not corrupt URLs containing $ signs", () => {
    const code = wrapSlide(`<img src="https://old.com/a.jpg" />`);
    const result = patchImageSrc(code, 0, "https://old.com/a.jpg", "https://cdn.com/$1/b.jpg");
    expect(result).toContain('src="https://cdn.com/$1/b.jpg"');
  });
});

describe("patchImageFit", () => {
  it("replaces objectFit value", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" style={{objectFit:'cover'}} />`);
    const result = patchImageFit(code, 0, "https://x.com/a.jpg", "contain");
    expect(result).toContain("objectFit:'contain'");
  });
  it("inserts objectFit when style has no objectFit", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" style={{width:'100%'}} />`);
    const result = patchImageFit(code, 0, "https://x.com/a.jpg", "fill");
    expect(result).toContain("objectFit:'fill'");
  });
});

describe("patchImageAlt", () => {
  it("replaces existing alt attribute (standard src-before-alt order)", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" alt="old alt" />`);
    const result = patchImageAlt(code, 0, "https://x.com/a.jpg", "new alt text");
    expect(result).not.toBeNull();
    expect(result).toContain('alt="new alt text"');
    expect(result).not.toContain('alt="old alt"');
    // Must not produce duplicate alt attributes
    const altCount = (result ?? "").split('alt=').length - 1;
    expect(altCount).toBe(1);
  });
  it("replaces alt when alt precedes src", () => {
    const code = wrapSlide(`<img alt="old alt" src="https://x.com/a.jpg" />`);
    const result = patchImageAlt(code, 0, "https://x.com/a.jpg", "updated");
    expect(result).not.toBeNull();
    expect(result).toContain('alt="updated"');
    expect(result).not.toContain('alt="old alt"');
    const altCount = (result ?? "").split('alt=').length - 1;
    expect(altCount).toBe(1);
  });
  it("inserts alt when no alt exists", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" />`);
    const result = patchImageAlt(code, 0, "https://x.com/a.jpg", "inserted");
    expect(result).not.toBeNull();
    expect(result).toContain('alt="inserted"');
  });
  it("returns null when src not found", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" alt="old" />`);
    expect(patchImageAlt(code, 0, "https://other.com/b.jpg", "new")).toBeNull();
  });
});

describe("patchLinkHref", () => {
  it("replaces href value", () => {
    const code = wrapSlide(`<a href="https://old.com">Click</a>`);
    const result = patchLinkHref(code, 0, "https://old.com", "https://new.com");
    expect(result).toContain('href="https://new.com"');
  });
  it("does not corrupt hrefs containing $ signs", () => {
    const code = wrapSlide(`<a href="https://old.com">Click</a>`);
    const result = patchLinkHref(code, 0, "https://old.com", "https://cdn.com/$1/path");
    expect(result).toContain('href="https://cdn.com/$1/path"');
  });
});

describe("patchLinkText", () => {
  it("replaces link text content", () => {
    const code = wrapSlide(`<a href="https://x.com">Old text</a>`);
    const result = patchLinkText(code, 0, "https://x.com", "New text");
    expect(result).toContain(">New text<");
  });
});

describe("patchLinkTarget", () => {
  it("adds target and rel when enabling new-tab", () => {
    const code = wrapSlide(`<a href="https://x.com">Link</a>`);
    const result = patchLinkTarget(code, 0, "https://x.com", true);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });
  it("removes target and rel when disabling new-tab", () => {
    const code = wrapSlide(`<a href="https://x.com" target="_blank" rel="noopener noreferrer">Link</a>`);
    const result = patchLinkTarget(code, 0, "https://x.com", false);
    expect(result).not.toContain('target="_blank"');
    expect(result).not.toContain('rel="noopener noreferrer"');
  });
});

describe("patchTextInElement", () => {
  it("replaces text content in a plain heading", () => {
    const code = wrapSlide(`<h1 className="text-4xl font-bold">Old Title</h1>`);
    const result = patchTextInElement(code, 0, "h1", "Old Title", "New Title");
    expect(result).not.toBeNull();
    expect(result).toContain(">New Title<");
    expect(result).not.toContain("Old Title");
  });

  it("replaces text in h2 with multiple attributes", () => {
    const code = wrapSlide(`<h2 className="text-2xl" style={{color:'red'}}>Section Heading</h2>`);
    const result = patchTextInElement(code, 0, "h2", "Section Heading", "Updated Heading");
    expect(result).not.toBeNull();
    expect(result).toContain(">Updated Heading<");
  });

  it("handles multi-line headings with surrounding whitespace", () => {
    const code = wrapSlide(`<h1 className="text-4xl">\n          My Title\n        </h1>`);
    const result = patchTextInElement(code, 0, "h1", "My Title", "New Title");
    expect(result).not.toBeNull();
    expect(result).toContain("New Title");
    expect(result).not.toContain("My Title");
  });

  it("returns null when old text is not found", () => {
    const code = wrapSlide(`<h1 className="text-4xl">Actual Title</h1>`);
    expect(patchTextInElement(code, 0, "h1", "Wrong Title", "New Title")).toBeNull();
  });

  it("escapes special regex characters in old text", () => {
    const code = wrapSlide(`<h3 className="text-lg">Revenue (Q1)</h3>`);
    const result = patchTextInElement(code, 0, "h3", "Revenue (Q1)", "Revenue (Q2)");
    expect(result).not.toBeNull();
    expect(result).toContain("Revenue (Q2)");
  });

  it("escapes HTML in new text to prevent injection", () => {
    const code = wrapSlide(`<h1>Safe Title</h1>`);
    const result = patchTextInElement(code, 0, "h1", "Safe Title", "<script>xss</script>");
    expect(result).not.toBeNull();
    expect(result).toContain("&lt;script&gt;xss&lt;/script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("patches text in JSON presentation (walks JSON tree)", () => {
    const data = { slides: [{ content: { headline: "Old Headline", body: "Some body" } }] };
    const code = JSON.stringify(data, null, 2);
    const result = patchTextInElement(code, 0, "h1", "Old Headline", "New Headline");
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.slides[0].content.headline).toBe("New Headline");
    expect(parsed.slides[0].content.body).toBe("Some body");
  });
});
