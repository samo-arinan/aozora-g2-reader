import {
  Bridge,
  G2_WIDTH,
  G2_HEIGHT,
  CreateStartUpPageContainer,
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

function buildListPage(items: string[]): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 1,
    listObject: [
      new ListContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: G2_WIDTH,
        height: G2_HEIGHT,
        borderWidth: 0,
        borderColor: 0,
        borderRdaius: 0,
        paddingLength: 4,
        containerID: 1,
        containerName: 'book-list',
        isEventCapture: 1,
        itemContainer: new ListItemContainerProperty({
          itemCount: items.length,
          itemWidth: 0,
          isItemSelectBorderEn: 1,
          itemName: items,
        }),
      }),
    ],
  });
}

function buildTextPage(content: string): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: G2_WIDTH,
        height: G2_HEIGHT,
        borderWidth: 0,
        borderColor: 0,
        paddingLength: 6,
        containerID: 1,
        containerName: 'reader-text',
        content,
        isEventCapture: 1,
      }),
    ],
  });
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
    await this.showBookList();
  }

  private async showBookList(): Promise<void> {
    this.state = 'BOOK_LIST';
    const items = BOOKS.map((b) => `${b.title}／${b.author}`);
    await this.bridge.createStartUpPageContainer(buildListPage(items));
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
      await this.showPage(true);
    } catch (e) {
      this.errorMessage = e instanceof Error ? e.message : String(e);
      this.state = 'ERROR';
      const msg = `読み込み失敗\n${this.errorMessage}\n\nクリックで戻る`;
      await this.bridge.createStartUpPageContainer(buildTextPage(msg));
      this.onStateChange('ERROR', { message: this.errorMessage });
    }
  }

  private async showPage(firstTime: boolean): Promise<void> {
    this.state = 'READING';
    const content = this.pages[this.pageIndex] ?? '';
    if (firstTime) {
      await this.bridge.createStartUpPageContainer(buildTextPage(content));
    } else {
      await this.bridge.textContainerUpgrade(buildTextUpgrade(content));
    }
    this.onStateChange('READING', {
      book: this.currentBook,
      pageIndex: this.pageIndex,
      totalPages: this.pages.length,
      content,
    });
  }

  private async handleEvent(event: import('./bridge').EvenHubEvent): Promise<void> {
    // リストイベント: 書籍選択
    const listEvent = event.listEvent;
    const textEvent = event.textEvent;
    const sysEvent = event.sysEvent;

    // どのコンテナからのイベントか判別してディスパッチ
    const rawEventType =
      listEvent?.eventType ?? textEvent?.eventType ?? sysEvent?.eventType;

    const isClick =
      rawEventType === OsEventTypeList.CLICK_EVENT || rawEventType === undefined;
    const isScrollDown = rawEventType === OsEventTypeList.SCROLL_BOTTOM_EVENT;
    const isScrollUp = rawEventType === OsEventTypeList.SCROLL_TOP_EVENT;

    if (this.state === 'BOOK_LIST') {
      if (isClick && listEvent) {
        const idx = listEvent.currentSelectItemIndex ?? 0;
        const book = BOOKS[idx];
        if (book) await this.loadBook(book);
      }
    } else if (this.state === 'READING') {
      if (isClick || isScrollUp) {
        if (this.pageIndex < this.pages.length - 1) {
          this.pageIndex++;
          await this.showPage(false);
        } else {
          await this.showBookList();
        }
      } else if (isScrollDown) {
        if (this.pageIndex > 0) {
          this.pageIndex--;
          await this.showPage(false);
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
