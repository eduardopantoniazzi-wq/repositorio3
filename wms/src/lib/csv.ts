export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  // BOM so Excel opens UTF-8 accented characters (ç, ã, é...) correctly.
  return "﻿" + lines.join("\r\n");
}
