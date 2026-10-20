// Минимальный безопасный Markdown → HTML для юридических текстов (заголовки, абзацы, списки, таблицы, цитаты, **жирный**).
// Весь текст экранируется; сырой HTML из исходника не проходит.
function esc(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function inline(text: string): string {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
}

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

export function renderMarkdown(source: string): string {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith('>'))
        body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
      continue;
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|'))
        rows.push(cells(lines[i++]));
      out.push(`<div class="table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const bullet = /^\s*[-*]\s+/;
    const ordered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || ordered.test(line)) {
      const kind = bullet.test(line) ? 'ul' : 'ol';
      const marker = kind === 'ul' ? bullet : ordered;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        if (marker.test(lines[i]))
          items.push(lines[i].replace(marker, ''));
        else if (/^\s+/.test(lines[i]) && items.length > 0)
          items[items.length - 1] += `\n${lines[i].trim()}`;
        else
          break;
        i++;
      }
      out.push(`<${kind}>${items.map(item => `<li>${item.split('\n').map(inline).join('<br>')}</li>`).join('')}</${kind}>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|>|\s*\|)/.test(lines[i]) && !bullet.test(lines[i]) && !(para.length > 0 && ordered.test(lines[i])))
      para.push(lines[i++].trim());
    if (para.length === 0)
      para.push(lines[i++].trim());
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }

  return out.join('\n');
}
