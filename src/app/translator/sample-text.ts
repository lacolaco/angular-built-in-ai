export type Lang = 'ja' | 'en' | 'zh-Hans' | 'es';

export const LANG_LABEL: Record<Lang, string> = {
  ja: '日本語',
  en: 'English',
  'zh-Hans': '中文 (简体)',
  es: 'Español',
};

export const LANG_CODES: readonly Lang[] = ['ja', 'en', 'zh-Hans', 'es'];

export interface SamplePost {
  readonly id: string;
  readonly source: Lang;
  readonly author: string;
  readonly text: string;
}

export const SAMPLE_POSTS: readonly SamplePost[] = [
  {
    id: 'ja-cherry-blossom',
    source: 'ja',
    author: 'sakura_lover',
    text: '今日は朝から青空が広がり、桜の花びらが風に舞っています。お弁当を持って近くの公園に行こうと思います。',
  },
  {
    id: 'en-quantum',
    source: 'en',
    author: 'quanta',
    text: 'Quantum computers operate on fundamentally different principles than classical computers. They can explore many possibilities at once and may unlock new algorithms in cryptography and chemistry.',
  },
  {
    id: 'zh-fushimi',
    source: 'zh-Hans',
    author: '京都散歩',
    text: '在京都的伏见稻荷大社，可以穿过被称为千本鸟居的红色鸟居隧道。傍晚的灯光下显得格外神秘。',
  },
  {
    id: 'es-paella',
    source: 'es',
    author: 'paella_fan',
    text: 'La paella valenciana original lleva arroz, conejo, pollo, garrofó, judía verde y azafrán. Se cocina a fuego de leña durante una tarde tranquila de domingo.',
  },
];
