const PROXY_BASE = import.meta.env.VITE_PROXY_BASE as string;
const INDEX_URL = 'https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip';

export interface Book {
  title: string;
  author: string;
  titleReading: string;
  authorReading: string;
  url: string;
  encoding: string;
}

export async function fetchBook(url: string, encoding: string): Promise<string> {
  const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(buf);
}

// G2テキストコンテナの実効上限は不明のため小さめに設定して試す
export const CHARS_PER_CHUNK = 400;

export function paginateText(text: string): string[] {
  const pages: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    if (candidate.length <= CHARS_PER_CHUNK) {
      current = candidate;
    } else {
      if (current) { pages.push(current); current = ''; }
      let remaining = para;
      while (remaining.length > CHARS_PER_CHUNK) {
        pages.push(remaining.slice(0, CHARS_PER_CHUNK));
        remaining = remaining.slice(CHARS_PER_CHUNK);
      }
      current = remaining;
    }
  }
  if (current) pages.push(current);
  return pages;
}

export function processText(raw: string): string {
  let text = raw;

  // ヘッダー除去: ------- 区切り線まで（最大2本）
  const headerSep = text.indexOf('-------');
  if (headerSep !== -1) {
    const afterSep = text.indexOf('\n', headerSep);
    text = text.slice(afterSep + 1);
    const secondSep = text.indexOf('-------');
    if (secondSep !== -1) {
      const afterSecond = text.indexOf('\n', secondSep);
      text = text.slice(afterSecond + 1);
    }
  }

  // フッター除去: 底本：以降
  const footerIdx = text.indexOf('底本：');
  if (footerIdx !== -1) text = text.slice(0, footerIdx);

  // ルビ除去: |漢字《かんじ》 → 漢字
  text = text.replace(/[|｜]([^《]+)《[^》]+》/g, '$1');
  // ルビ除去: 漢字《かんじ》 → 漢字（パイプなし）
  text = text.replace(/([^\s|｜])《[^》]+》/g, '$1');
  text = text.replace(/《[^》]+》/g, '');

  // 注記除去: ［＃...］
  text = text.replace(/［＃[^\]]*?］/g, '');

  // 全角スペース→半角スペース
  text = text.replace(/　/g, ' ');

  // 3行以上の連続空行→2行
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

// ---- 青空文庫インデックス検索 ----

let indexCache: Book[] | null = null;

// カタカナ→ひらがな変換（音声認識結果との照合に使う）
function toHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// 共通前方一致の長さを返す
function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export async function searchBooks(keyword: string): Promise<Book[]> {
  if (!indexCache) {
    indexCache = await fetchAndParseIndex();
  }
  const kw = toHiragana(keyword);
  return indexCache
    .filter((b) => {
      // 漢字検索（テキスト入力用）
      if (b.title.includes(keyword) || b.author.includes(keyword)) return true;
      // 読み仮名検索
      const tr = toHiragana(b.titleReading);
      const ar = toHiragana(b.authorReading);
      // 完全部分一致
      if (tr.includes(kw) || ar.includes(kw)) return true;
      // 前方一致3文字以上（音声認識のずれに対応）
      if (commonPrefixLen(kw, ar) >= 3) return true;
      if (commonPrefixLen(kw, tr) >= 3) return true;
      return false;
    })
    .slice(0, 20); // G2のリストコンテナ最大20件
}

async function fetchAndParseIndex(): Promise<Book[]> {
  console.log('[aozora] fetching index CSV...');
  const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(INDEX_URL)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`index fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  // インデックスZIPはUTF-8 CSV（プロキシがZIP解凍済みのバイト列を返す）
  const text = new TextDecoder('utf-8').decode(buf);
  const books = parseIndex(text);
  console.log(`[aozora] index loaded: ${books.length} books`);
  return books;
}

function parseIndex(csv: string): Book[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const col = (name: string) => headers.indexOf(name);

  const titleIdx = col('作品名');
  const titleReadingIdx = col('作品名読み');
  const lastIdx = col('姓');
  const firstIdx = col('名');
  const lastReadingIdx = col('姓読み');
  const firstReadingIdx = col('名読み');
  const urlIdx = col('テキストファイルURL');
  const encIdx = col('テキストファイル符号化方式');
  const copyrightIdx = col('作品著作権フラグ');

  const books: Book[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);

    if (cols[copyrightIdx] !== 'なし') continue;
    const url = cols[urlIdx] ?? '';
    if (!url.endsWith('.zip')) continue;

    const encoding = cols[encIdx] === 'ShiftJIS' ? 'shift-jis' : 'utf-8';
    const author = `${cols[lastIdx] ?? ''}${cols[firstIdx] ?? ''}`;
    const authorReading = `${cols[lastReadingIdx] ?? ''}${cols[firstReadingIdx] ?? ''}`;

    books.push({
      title: cols[titleIdx] ?? '',
      titleReading: cols[titleReadingIdx] ?? '',
      author,
      authorReading,
      url,
      encoding,
    });
  }
  return books;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { fields.push(field); field = ''; }
      else { field += c; }
    }
  }
  fields.push(field);
  return fields;
}
