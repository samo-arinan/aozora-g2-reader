import { initBridge, getMockBridge } from './bridge';
import { OsEventTypeList, List_ItemEvent, Text_ItemEvent } from '@evenrealities/even_hub_sdk';
import { App } from './app';
import { BOOKS } from './books';

async function main() {
  const statusEl = document.getElementById('status')!;
  const sdkResultEl = document.getElementById('sdk-result')!;
  const previewEl = document.getElementById('preview')!;
  const pageInfoEl = document.getElementById('page-info')!;

  statusEl.textContent = '接続中...';

  const { bridge, isMock } = await initBridge();
  statusEl.textContent = isMock ? 'モック（シミュレーション）' : 'G2接続済み';
  statusEl.style.color = isMock ? '#f90' : '#0f0';

  const app = new App(bridge, (state, data) => {
    updateDebugUI(state, data);
  });

  function updateDebugUI(state: string, data: unknown) {
    const d = data as Record<string, unknown> | undefined;

    if (state === 'BOOK_LIST') {
      const books = BOOKS.map((b, i) => `[${i}] ${b.title}／${b.author}`).join('\n');
      previewEl.textContent = `=== 書籍リスト ===\n\n${books}`;
      const sdkResult = d?.sdkResult;
      sdkResultEl.textContent = `SDK結果: ${sdkResult ?? '?'} (0=成功 1=不正 2=大きすぎ 3=メモリ不足)`;
      pageInfoEl.textContent = '書籍を選択してください';
    } else if (state === 'LOADING') {
      const book = d?.book as { title: string; author: string } | undefined;
      previewEl.textContent = `読み込み中...\n\n${book?.title ?? ''}`;
      pageInfoEl.textContent = '取得中...';
    } else if (state === 'READING') {
      const content = (d?.content as string) ?? '';
      const pageIndex = (d?.pageIndex as number) ?? 0;
      const totalPages = (d?.totalPages as number) ?? 0;
      const book = d?.book as { title: string } | undefined;
      previewEl.textContent = content;
      pageInfoEl.textContent = `${book?.title ?? ''} | ${pageIndex + 1} / ${totalPages} ページ`;
    } else if (state === 'ERROR') {
      previewEl.textContent = `エラー\n\n${(d?.message as string) ?? ''}`;
      pageInfoEl.textContent = 'クリックで戻る';
    }
  }

  // シミュレーションボタン（モック時のみ有効）
  if (isMock) {
    const mock = getMockBridge();

    document.getElementById('btn-click')?.addEventListener('click', () => {
      const sel = document.getElementById('book-select') as HTMLSelectElement | null;
      const idx = sel ? parseInt(sel.value) : 0;
      mock.emit({
        listEvent: new List_ItemEvent({
          eventType: OsEventTypeList.CLICK_EVENT,
          currentSelectItemIndex: idx,
          containerID: 1,
          containerName: 'book-list',
        }),
      });
    });

    document.getElementById('btn-scroll-down')?.addEventListener('click', () => {
      mock.emit({
        textEvent: new Text_ItemEvent({ eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT, containerID: 1, containerName: 'reader-text' }),
      });
    });

    document.getElementById('btn-scroll-up')?.addEventListener('click', () => {
      mock.emit({
        textEvent: new Text_ItemEvent({ eventType: OsEventTypeList.SCROLL_TOP_EVENT, containerID: 1, containerName: 'reader-text' }),
      });
    });

    // 書籍選択セレクトにオプション追加
    const sel = document.getElementById('book-select') as HTMLSelectElement | null;
    if (sel) {
      BOOKS.forEach((b, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${i}: ${b.title}`;
        sel.appendChild(opt);
      });
    }
  } else {
    const simPanel = document.getElementById('sim-panel');
    if (simPanel) simPanel.style.display = 'none';
  }

  await app.start();
}

main().catch((e) => {
  console.error(e);
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = `起動失敗: ${e instanceof Error ? e.message : String(e)}`;
    statusEl.style.color = '#f00';
  }
});
