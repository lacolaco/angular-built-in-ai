export interface SampleImage {
  readonly key: 'A' | 'B' | 'C';
  readonly src: string;
  readonly alt: string;
}

export const SAMPLE_IMAGES: readonly SampleImage[] = [
  { key: 'A', src: 'samples/pexels-cat-35224529.jpg', alt: 'カラフルなブランケットの上でくつろぐ灰色の猫' },
  { key: 'B', src: 'samples/pexels-sushi-327172.jpg', alt: '皿に盛り付けられた寿司' },
  { key: 'C', src: 'samples/pexels-mountain-17970665.jpg', alt: '霧に包まれた山岳風景' },
];
