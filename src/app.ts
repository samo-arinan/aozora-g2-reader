import {
  Bridge,
  G2_WIDTH,
  G2_HEIGHT,
  CreateStartUpPageContainer,
  RebuildPageContainer,
} from './bridge';
import {
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import { Book, fetchBook, processText, paginateText, searchBooks } from './aozora';
import { TextContainerUpgrade } from './bridge';

type State = 'SEARCH_RESULTS' | 'LOADING' | 'READING' | 'ERROR';

function listContainerArgs(items: string[]) {
  return {
    containerTotalNum: 1,
    listObject: [
      new ListContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: G2_WIDTH,
        height: G2_HEIGHT,
        borderWidth: 1,
        borderColor: 13,
        borderRdaius: 6,
        paddingLength: 5,
        containerID: 1,
        containerName: 'book-list',
        isEventCapture: 1,
        itemContainer: new ListItemContainerProperty({
          itemCount: items.length,
          itemWidth: 0,
          isItemSelectBorderEn: 0,
          itemName: items,
        }),
      }),
    ],
  };
}

function textContainerArgs(content: string) {
  return {
    containerTotalNum: 1,
    textObject: [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: G2_WIDTH,
        height: G2_HEIGHT,
        borderWidth: 1,
        borderColor: 5,
        paddingLength: 6,
        borderRdaius: 6,
        containerID: 1,
        containerName: 'reader-text',
        content,
        isEventCapture: 1,
      }),
    ],
  };
}

export type StateChangeListener = (state: State, data?: unknown) => void;

export class App {
  private state: State = 'SEARCH_RESULTS';
  private searchResults: Book[] = [];
  private lastKeyword = '';
  private pages: string[] = [];
  private pageIndex = 0;
  private currentBook: Book | null = null;
  private onStateChange: StateChangeListener;

  constructor(private bridge: Bridge, onStateChange: StateChangeListener) {
    this.onStateChange = onStateChange;
    bridge.onEvenHubEvent(this.handleEvent.bind(this));
  }

  async start(): Promise<void> {
    const args = listContainerArgs(['（キーワードを入力して検索）']);
    const result = await this.bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer(args)
    );
    console.log('[app] createStartUpPageContainer result:', result);
    this.state = 'SEARCH_RESULTS';
    this.onStateChange('SEARCH_RESULTS', { results: [], sdkResult: result });
  }

  async search(keyword: string): Promise<void> {
    if (!keyword.trim()) return;
    this.lastKeyword = keyword;
    this.state = 'LOADING';
    this.onStateChange('LOADING', { message: `検索中: ${keyword}` });
    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer(textContainerArgs(`インデックス取得中...\n初回は数秒かかります`))
    );
    try {
      const results = await searchBooks(keyword);
      await this.showSearchResults(results);
    } catch (e) {
      await this.showError(e);
    }
  }

  private async showSearchResults(results: Book[]): Promise<void> {
    this.searchResults = results;
    this.state = 'SEARCH_RESULTS';
    const items =
      results.length > 0
        ? results.map((b) => `${b.title}／${b.author}`)
        : ['（該当なし）'];
    const ok = await this.bridge.rebuildPageContainer(new RebuildPageContainer(listContainerArgs(items)));
    console.log('[app] showSearchResults rebuildPageContainer:', ok, `items=${items.length}`);
    this.onStateChange('SEARCH_RESULTS', { results, keyword: this.lastKeyword });
  }

  private async loadBook(book: Book): Promise<void> {
    this.state = 'LOADING';
    this.onStateChange('LOADING', { book });
    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer(textContainerArgs(`読み込み中...\n\n${book.title}`))
    );
    try {
      const raw = await fetchBook(book.url, book.encoding);
      const processed = processText(raw);
      this.pages = paginateText(processed);
      this.pageIndex = 0;
      this.currentBook = book;
      await this.showChunk();
    } catch (e) {
      await this.showError(e);
    }
  }

  private async showChunk(): Promise<void> {
    this.state = 'READING';
    const content = this.pages[this.pageIndex] ?? '';
    console.log(`[app] showChunk page=${this.pageIndex}/${this.pages.length} len=${content.length}`);
    // 初回はrebuildPageContainer、以降はtextContainerUpgradeで軽量更新
    if (this.pageIndex === 0) {
      // コンテナ構造をテキストに切り替え
      await this.bridge.rebuildPageContainer(new RebuildPageContainer(textContainerArgs(content)));
    }
    // rebuildPageContainerが届かない場合もあるのでtextContainerUpgradeで確実に送る
    const ok = await this.bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1,
        containerName: 'reader-text',
        contentOffset: this.pageIndex,
        contentLength: this.pages.length,
        content,
      })
    );
    console.log(`[app] textContainerUpgrade page=${this.pageIndex}:`, ok);
    this.onStateChange('READING', {
      book: this.currentBook,
      pageIndex: this.pageIndex,
      totalPages: this.pages.length,
      content,
    });
  }

  private async showError(e: unknown): Promise<void> {
    const message = e instanceof Error ? e.message : String(e);
    this.state = 'ERROR';
    await this.bridge.rebuildPageContainer(
      new RebuildPageContainer(textContainerArgs(`エラー\n${message}\n\nクリックで戻る`))
    );
    this.onStateChange('ERROR', { message });
  }

  private async handleEvent(event: import('./bridge').EvenHubEvent): Promise<void> {
    const { listEvent, textEvent, sysEvent } = event;

    const isClick =
      sysEvent?.eventType === OsEventTypeList.CLICK_EVENT ||
      (sysEvent !== undefined && sysEvent.eventType === undefined);
    const isScrollNext = textEvent?.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT;
    const isScrollPrev = textEvent?.eventType === OsEventTypeList.SCROLL_TOP_EVENT;

    if (listEvent) {
      console.log('[event] listEvent index:', listEvent.currentSelectItemIndex, 'name:', listEvent.currentSelectItemName);
    }

    if (this.state === 'SEARCH_RESULTS' && listEvent && this.searchResults.length > 0) {
      const idx = listEvent.currentSelectItemIndex ?? 0;
      const book = this.searchResults[idx];
      if (book) await this.loadBook(book);
      return;
    }

    if (this.state === 'READING') {
      if (isScrollNext || isClick) {
        if (this.pageIndex < this.pages.length - 1) {
          this.pageIndex++;
          await this.showChunk();
        } else {
          // 最後のチャンク → 検索に戻る
          await this.showSearchResults(this.searchResults);
        }
        return;
      }
      if (isScrollPrev) {
        if (this.pageIndex > 0) {
          this.pageIndex--;
          await this.showChunk();
        }
        return;
      }
    }

    if (this.state === 'ERROR' && isClick) {
      await this.showSearchResults(this.searchResults);
    }
  }
}
