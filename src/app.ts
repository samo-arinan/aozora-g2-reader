import {
  Bridge,
  G2_WIDTH,
  G2_HEIGHT,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
} from './bridge';
import {
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import { BOOKS, Book } from './books';
import { fetchBook, processText, paginateText } from './aozora';

type State = 'BOOK_LIST' | 'LOADING' | 'READING' | 'ERROR';

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
          itemWidth: G2_WIDTH - 14,
          isItemSelectBorderEn: 1,
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

function buildTextUpgrade(content: string): TextContainerUpgrade {
  return new TextContainerUpgrade({
    containerID: 1,
    containerName: 'reader-text',
    contentOffset: 0,
    contentLength: content.length,
    content,
  });
}

export type StateChangeListener = (state: State, data?: unknown) => void;

export class App {
  private state: State = 'BOOK_LIST';
  private pages: string[] = [];
  private pageIndex = 0;
  private currentBook: Book | null = null;
  private onStateChange: StateChangeListener;
  private errorMessage = '';

  constructor(private bridge: Bridge, onStateChange: StateChangeListener) {
    this.onStateChange = onStateChange;
    bridge.onEvenHubEvent(this.handleEvent.bind(this));
  }

  async start(): Promise<void> {
    // createStartUpPageContainer は初回のみ
    const items = BOOKS.map((b) => `${b.title}／${b.author}`);
    const args = listContainerArgs(items);
    const result = await this.bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer(args)
    );
    console.log('[app] createStartUpPageContainer result:', result);
    this.state = 'BOOK_LIST';
    this.onStateChange('BOOK_LIST', { books: BOOKS, sdkResult: result });
  }

  private async showBookList(): Promise<void> {
    this.state = 'BOOK_LIST';
    const items = BOOKS.map((b) => `${b.title}／${b.author}`);
    await this.bridge.rebuildPageContainer(new RebuildPageContainer(listContainerArgs(items)));
    this.onStateChange('BOOK_LIST', { books: BOOKS });
  }

  private async loadBook(book: Book): Promise<void> {
    this.state = 'LOADING';
    this.currentBook = book;
    this.onStateChange('LOADING', { book });

    try {
      const raw = await fetchBook(book.url, book.encoding);
      const processed = processText(raw);
      this.pages = paginateText(processed);
      this.pageIndex = 0;
      await this.showPage();
    } catch (e) {
      this.errorMessage = e instanceof Error ? e.message : String(e);
      this.state = 'ERROR';
      const msg = `読み込み失敗\n${this.errorMessage}\n\nクリックで戻る`;
      await this.bridge.rebuildPageContainer(new RebuildPageContainer(textContainerArgs(msg)));
      this.onStateChange('ERROR', { message: this.errorMessage });
    }
  }

  private async showPage(): Promise<void> {
    this.state = 'READING';
    const content = this.pages[this.pageIndex] ?? '';
    await this.bridge.rebuildPageContainer(new RebuildPageContainer(textContainerArgs(content)));
    this.onStateChange('READING', {
      book: this.currentBook,
      pageIndex: this.pageIndex,
      totalPages: this.pages.length,
      content,
    });
  }

  private async handleEvent(event: import('./bridge').EvenHubEvent): Promise<void> {
    const { listEvent, textEvent, sysEvent } = event;

    // クリック・ダブルクリック: sysEvent
    const isClick =
      sysEvent?.eventType === OsEventTypeList.CLICK_EVENT ||
      sysEvent?.eventType === undefined && sysEvent !== undefined;

    // スクロール: textEvent
    const isScrollUp = textEvent?.eventType === OsEventTypeList.SCROLL_TOP_EVENT;
    const isScrollDown = textEvent?.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT;

    if (this.state === 'BOOK_LIST') {
      // リスト項目が選択された: listEvent
      if (listEvent) {
        const idx = listEvent.currentSelectItemIndex ?? 0;
        const book = BOOKS[idx];
        if (book) await this.loadBook(book);
      }
    } else if (this.state === 'READING') {
      if (isClick || isScrollUp) {
        if (this.pageIndex < this.pages.length - 1) {
          this.pageIndex++;
          await this.showPage();
        } else {
          await this.showBookList();
        }
      } else if (isScrollDown) {
        if (this.pageIndex > 0) {
          this.pageIndex--;
          await this.showPage();
        } else {
          await this.showBookList();
        }
      }
    } else if (this.state === 'ERROR') {
      if (isClick) {
        await this.showBookList();
      }
    }
  }
}
