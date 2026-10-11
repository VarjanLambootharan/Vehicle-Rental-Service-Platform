/** Traveler's versioned plain-text protocol, shared by HTTP and the Java .txt store. */
const header = "TRAVELER-TEXT-1";
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
function unescape(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "\t" || c === "\r") throw new Error("Unescaped text separator");
    if (c !== "\\") {
      result += c;
      continue;
    }
    const next = value[++i];
    if (next === "\\") result += "\\";
    else if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else throw new Error("Invalid text escape");
  }
  return result;
}

export function encodeText(value: unknown): string {
  const lines = [header];
  function write(item: unknown, depth: number) {
    if (depth > 32) throw new Error("Text nesting limit exceeded");
    if (item === null) lines.push("null");
    else if (typeof item === "string") lines.push(`string\t${escape(item)}`);
    else if (typeof item === "boolean") lines.push(`boolean\t${item}`);
    else if (typeof item === "number" && Number.isFinite(item))
      lines.push(`number\t${item}`);
    else if (Array.isArray(item)) {
      lines.push(`list\t${item.length}`);
      item.forEach((entry) => write(entry, depth + 1));
    } else if (typeof item === "object" && item !== null) {
      const entries = Object.entries(item).filter(
        ([, entry]) => entry !== undefined,
      );
      lines.push(`object\t${entries.length}`);
      for (const [key, entry] of entries) {
        lines.push(`key\t${escape(key)}`);
        write(entry, depth + 1);
      }
    } else throw new Error("Unsupported text value");
  }
  write(value, 0);
  return lines.join("\n") + "\n";
}

export function decodeText<T = unknown>(text: string): T {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.shift() !== header) throw new Error("Invalid text format header");
  let index = 0;
  function count(value: string): number {
    if (!/^(0|[1-9][0-9]*)$/.test(value) || Number(value) > 1_000_000)
      throw new Error("Invalid text item count");
    return Number(value);
  }
  function read(depth: number): unknown {
    if (depth > 32) throw new Error("Text nesting limit exceeded");
    const line = lines[index++];
    if (line === undefined) throw new Error("Truncated text document");
    if (line === "null") return null;
    const tab = line.indexOf("\t");
    if (tab < 0) throw new Error("Missing text separator");
    const tag = line.slice(0, tab),
      value = line.slice(tab + 1);
    if (tag === "string") return unescape(value);
    if (tag === "boolean" && /^(true|false)$/.test(value))
      return value === "true";
    if (
      tag === "number" &&
      /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(value) &&
      Number.isFinite(Number(value))
    )
      return Number(value);
    if (tag === "list")
      return Array.from({ length: count(value) }, () => read(depth + 1));
    if (tag === "object") {
      const result: Record<string, unknown> = Object.create(null);
      const size = count(value);
      for (let i = 0; i < size; i++) {
        const keyLine = lines[index++];
        if (!keyLine?.startsWith("key\t"))
          throw new Error("Missing text field name");
        const key = unescape(keyLine.slice(4));
        if (Object.hasOwn(result, key)) throw new Error("Duplicate text field");
        result[key] = read(depth + 1);
      }
      return result;
    }
    throw new Error("Invalid text tag or value");
  }
  const value = read(0);
  if (index !== lines.length) throw new Error("Unexpected trailing text");
  return value as T;
}
