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
    url: 'https://www.aozora.gr.jp/cards/000879/files/127_ruby_150.zip',
    encoding: 'shift-jis',
  },
  {
    title: '蜘蛛の糸',
    author: '芥川龍之介',
    url: 'https://www.aozora.gr.jp/cards/000879/files/92_ruby_164.zip',
    encoding: 'shift-jis',
  },
  {
    title: '鼻',
    author: '芥川龍之介',
    url: 'https://www.aozora.gr.jp/cards/000879/files/42_ruby_154.zip',
    encoding: 'shift-jis',
  },
  {
    title: '坊っちゃん',
    author: '夏目漱石',
    url: 'https://www.aozora.gr.jp/cards/000148/files/752_ruby_2438.zip',
    encoding: 'shift-jis',
  },
  {
    title: 'こころ',
    author: '夏目漱石',
    url: 'https://www.aozora.gr.jp/cards/000148/files/773_ruby_5968.zip',
    encoding: 'shift-jis',
  },
  {
    title: '銀河鉄道の夜',
    author: '宮沢賢治',
    url: 'https://www.aozora.gr.jp/cards/000081/files/43737_ruby_19028.zip',
    encoding: 'shift-jis',
  },
  {
    title: 'ごんぎつね',
    author: '新美南吉',
    url: 'https://www.aozora.gr.jp/cards/000121/files/628_ruby_649.zip',
    encoding: 'shift-jis',
  },
];
