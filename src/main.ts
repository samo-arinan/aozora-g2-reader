import { initBridge, getMockBridge } from './bridge';
import { OsEventTypeList, List_ItemEvent, Text_ItemEvent } from '@evenrealities/even_hub_sdk';
import { App } from './app';

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

    if (state === 'SEARCH_RESULTS') {
      const results = d?.results as Array<{ title: string; author: string }> | undefined;
      const keyword = d?.keyword as string | undefined;
      const sdkResult = d?.sdkResult;
      if (sdkResult !== undefined) {
        sdkResultEl.textContent = `SDK結果: ${sdkResult} (0=成功 1=不正 2=大きすぎ 3=メモリ不足)`;
      }
      if (results && results.length > 0) {
        const list = results.map((b, i) => `[${i}] ${b.title}／${b.author}`).join('\n');
        previewEl.textContent = `=== 検索結果: "${keyword}" ===\n\n${list}`;
        pageInfoEl.textContent = `${results.length} 件`;
      } else {
        previewEl.textContent = keyword ? `「${keyword}」の結果なし` : '（検索してください）';
        pageInfoEl.textContent = '';
      }
    } else if (state === 'LOADING') {
      const msg = d?.message as string | undefined;
      previewEl.textContent = msg ?? '読み込み中...';
      pageInfoEl.textContent = '';
    } else if (state === 'READING') {
      const content = (d?.content as string) ?? '';
      const book = d?.book as { title: string; author: string } | undefined;
      const pageIndex = (d?.pageIndex as number) ?? 0;
      const totalPages = (d?.totalPages as number) ?? 0;
      previewEl.textContent = content;
      pageInfoEl.textContent = `${book?.title ?? ''} ／ ${book?.author ?? ''} | ${pageIndex + 1}/${totalPages} | クリック/下スクロールで次`;
    } else if (state === 'ERROR') {
      previewEl.textContent = `エラー\n\n${(d?.message as string) ?? ''}`;
      pageInfoEl.textContent = 'クリックで戻る';
    }
  }

  // 検索フォーム
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  document.getElementById('btn-search')?.addEventListener('click', () => {
    const kw = searchInput?.value.trim() ?? '';
    if (kw) app.search(kw);
  });
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const kw = searchInput.value.trim();
      if (kw) app.search(kw);
    }
  });

  // シミュレーション操作（モック時のみ）
  if (isMock) {
    const mock = getMockBridge();

    document.getElementById('btn-click')?.addEventListener('click', () => {
      mock.emit({ sysEvent: { eventType: OsEventTypeList.CLICK_EVENT, containerID: 1, containerName: 'book-list' } as never });
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

    document.getElementById('btn-list-click')?.addEventListener('click', () => {
      const sel = document.getElementById('list-index') as HTMLInputElement | null;
      const idx = sel ? parseInt(sel.value) || 0 : 0;
      mock.emit({
        listEvent: new List_ItemEvent({
          eventType: OsEventTypeList.CLICK_EVENT,
          currentSelectItemIndex: idx,
          containerID: 1,
          containerName: 'book-list',
        }),
      });
    });
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
