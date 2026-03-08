const PROXY_BASE = import.meta.env.VITE_PROXY_BASE as string;

export async function fetchBook(url: string, encoding: string): Promise<string> {
  const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(buf);
}

export function processText(raw: string): string {
  let text = raw;

  // ヘッダー除去: ------- 区切り前を削除（最後の区切り線まで）
  const headerSep = text.indexOf('-------');
  if (headerSep !== -1) {
    const afterSep = text.indexOf('\n', headerSep);
    text = text.slice(afterSep + 1);
    // 2本目の区切り線がある場合も除去
    const secondSep = text.indexOf('-------');
    if (secondSep !== -1) {
      const afterSecond = text.indexOf('\n', secondSep);
      text = text.slice(afterSecond + 1);
    }
  }

  // フッター除去: 底本：以降
  const footerIdx = text.indexOf('底本：');
  if (footerIdx !== -1) {
    text = text.slice(0, footerIdx);
  }

  // ルビ除去: |漢字《かんじ》 → 漢字
  text = text.replace(/[|｜]([^《]+)《[^》]+》/g, '$1');
  // ルビ除去: 漢字《かんじ》 → 漢字（パイプなし）
  text = text.replace(/([^\s|｜])《[^》]+》/g, '$1');
  // 残った《...》除去
  text = text.replace(/《[^》]+》/g, '');

  // 注記除去: ［＃...］
  text = text.replace(/［＃[^\]]*?］/g, '');

  // 全角スペース→半角スペース
  text = text.replace(/　/g, ' ');

  // 3行以上の連続空行→2行
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export function paginateText(text: string, charsPerPage = 220): string[] {
  const pages: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;

    if (candidate.length <= charsPerPage) {
      current = candidate;
    } else {
      // candidateが制限超え
      if (current) {
        pages.push(current);
        current = '';
      }
      // paraが1ページに収まらない場合は強制分割
      let remaining = para;
      while (remaining.length > charsPerPage) {
        pages.push(remaining.slice(0, charsPerPage));
        remaining = remaining.slice(charsPerPage);
      }
      current = remaining;
    }
  }

  if (current) pages.push(current);
  return pages;
}
