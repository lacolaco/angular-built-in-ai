export interface SampleText {
  readonly key: 'A' | 'B' | 'C' | 'D';
  readonly label: string;
  readonly text: string;
}

export const SAMPLE_TEXTS: readonly SampleText[] = [
  {
    key: 'A',
    label: 'English',
    text: 'The quick brown fox jumps over the lazy dog near the riverbank at dawn.',
  },
  {
    key: 'B',
    label: '日本語',
    text: '吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。',
  },
  {
    key: 'C',
    label: '中文',
    text: '我是一只猫。还没有名字。完全不知道在什么地方出生的。',
  },
  {
    key: 'D',
    label: 'Español',
    text: 'Soy un gato. Aún no tengo nombre. No tengo la menor idea de dónde nací.',
  },
];
