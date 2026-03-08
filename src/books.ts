export interface Book {
  title: string;
  author: string;
  url: string;
  encoding: string;
}

export const BOOKS: Book[] = [
  {
    title: '羅生門',
    author: '芥川龍之介',
    url: 'https://www.aozora.gr.jp/cards/000879/files/127_15260.txt',
    encoding: 'shift-jis',
  },
  {
    title: '蜘蛛の糸',
    author: '芥川龍之介',
    url: 'https://www.aozora.gr.jp/cards/000879/files/92_14545.txt',
    encoding: 'shift-jis',
  },
  {
    title: '鼻',
    author: '芥川龍之介',
    url: 'https://www.aozora.gr.jp/cards/000879/files/114_14516.txt',
    encoding: 'shift-jis',
  },
  {
    title: '坊っちゃん',
    author: '夏目漱石',
    url: 'https://www.aozora.gr.jp/cards/000148/files/752_14964.txt',
    encoding: 'shift-jis',
  },
  {
    title: 'こころ',
    author: '夏目漱石',
    url: 'https://www.aozora.gr.jp/cards/000148/files/773_14560.txt',
    encoding: 'shift-jis',
  },
  {
    title: '銀河鉄道の夜',
    author: '宮沢賢治',
    url: 'https://www.aozora.gr.jp/cards/000081/files/43737_19215.txt',
    encoding: 'shift-jis',
  },
  {
    title: 'ごんぎつね',
    author: '新美南吉',
    url: 'https://www.aozora.gr.jp/cards/000121/files/628_14895.txt',
    encoding: 'shift-jis',
  },
];
