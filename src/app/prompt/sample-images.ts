export interface SampleImage {
  readonly key: 'A' | 'B' | 'C';
  readonly src: string;
  readonly alt: string;
}

export const SAMPLE_IMAGES: readonly SampleImage[] = [
  { key: 'A', src: 'samples/pexels-cat-35224529.jpg', alt: 'カラフルなブランケットの上でくつろぐ灰色の猫' },
  { key: 'B', src: 'samples/pexels-sushi-1148083.jpg', alt: 'クローズアップで撮影されたサーモン寿司' },
  { key: 'C', src: 'samples/pexels-mountain-27661221.jpg', alt: '夕焼けに染まる山並み' },
];
