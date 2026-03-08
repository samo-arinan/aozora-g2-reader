import {
  waitForEvenAppBridge,
  EvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  StartUpPageCreateResult,
  type EvenHubEvent,
  type DeviceStatus,
} from '@evenrealities/even_hub_sdk';

export { CreateStartUpPageContainer, RebuildPageContainer, TextContainerUpgrade, StartUpPageCreateResult };
export type { EvenHubEvent };

export const G2_WIDTH = 576;
export const G2_HEIGHT = 288;

// アプリが使うBridgeの最小インターフェース
export interface Bridge {
  createStartUpPageContainer(container: CreateStartUpPageContainer): Promise<StartUpPageCreateResult>;
  rebuildPageContainer(container: RebuildPageContainer): Promise<boolean>;
  textContainerUpgrade(container: TextContainerUpgrade): Promise<boolean>;
  onEvenHubEvent(callback: (event: EvenHubEvent) => void): () => void;
  onDeviceStatusChanged(callback: (status: DeviceStatus) => void): () => void;
}

// モックブリッジ: SDK接続失敗時のフォールバック
class MockBridge implements Bridge {
  private eventListeners: Array<(event: EvenHubEvent) => void> = [];

  async createStartUpPageContainer(container: CreateStartUpPageContainer): Promise<StartUpPageCreateResult> {
    console.log('[MockBridge] createStartUpPageContainer', container);
    return StartUpPageCreateResult.success;
  }

  async rebuildPageContainer(container: RebuildPageContainer): Promise<boolean> {
    console.log('[MockBridge] rebuildPageContainer', container);
    return true;
  }

  async textContainerUpgrade(container: TextContainerUpgrade): Promise<boolean> {
    console.log('[MockBridge] textContainerUpgrade', container);
    return true;
  }

  onEvenHubEvent(callback: (event: EvenHubEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== callback);
    };
  }

  onDeviceStatusChanged(_callback: (status: DeviceStatus) => void): () => void {
    return () => {};
  }

  // デバッグUI用: シミュレーションイベントを発火
  emit(event: EvenHubEvent): void {
    this.eventListeners.forEach((l) => l(event));
  }
}

let mockBridgeInstance: MockBridge | null = null;

export function getMockBridge(): MockBridge {
  if (!mockBridgeInstance) mockBridgeInstance = new MockBridge();
  return mockBridgeInstance;
}

function wrapRealBridge(real: EvenAppBridge): Bridge {
  return {
    createStartUpPageContainer: (c) => real.createStartUpPageContainer(c),
    rebuildPageContainer: (c) => real.rebuildPageContainer(c),
    textContainerUpgrade: (c) => real.textContainerUpgrade(c),
    onEvenHubEvent: (cb) => real.onEvenHubEvent(cb),
    onDeviceStatusChanged: (cb) => real.onDeviceStatusChanged(cb),
  };
}

export async function initBridge(): Promise<{ bridge: Bridge; isMock: boolean }> {
  try {
    const real = await waitForEvenAppBridge();
    return { bridge: wrapRealBridge(real), isMock: false };
  } catch (e) {
    console.warn('[bridge] SDK init failed, using MockBridge:', e);
    return { bridge: getMockBridge(), isMock: true };
  }
}
