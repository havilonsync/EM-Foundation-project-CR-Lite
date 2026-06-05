import { Fragment, type ReactNode } from "react";

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "unordered"; items: string[] };

function normalizeAnswerText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\s+(?=\d+\.\s+\*\*)/g, "\n")
    .replace(/([.:;!?])\s+(?=\d+\.\s)/g, "$1\n")
    .replace(/:\s+(?=\d+\.\s)/g, ":\n")
    .replace(/\s+(?=[-*•]\s+\*\*)/g, "\n")
    .replace(/\s+(?=[-*•]\s)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = normalizeAnswerText(text).split("\n");

  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    const line = lines[index].trim();
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    const unorderedMatch = line.match(/^[-*•]\s+(.*)$/);

    if (orderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = current.match(/^\d+\.\s+(.*)$/);
        if (!match) {
          break;
        }
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "ordered", items });
      continue;
    }

    if (unorderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = current.match(/^[-*•]\s+(.*)$/);
        if (!match) {
          break;
        }
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "unordered", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim() !== "") {
      const current = lines[index].trim();
      if (current.match(/^\d+\.\s+/) || current.match(/^[-*•]\s+/)) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={index}>{boldMatch[1]}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function AnswerText({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div
      className="text-sm leading-relaxed"
      style={{ color: "var(--stone)" }}
    >
      {blocks.map((block, blockIndex) => {
        if (block.type === "ordered") {
          return (
            <ol
              key={blockIndex}
              className="mb-4 list-decimal space-y-3 pl-5"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered") {
          return (
            <ul
              key={blockIndex}
              className="mb-4 list-disc space-y-3 pl-5"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="mb-4 last:mb-0">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
