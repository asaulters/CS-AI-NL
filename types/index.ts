export interface Source {
    id: string;
    name: string;
    type: 'rss' | 'html' | 'dyn';
    url: string;
    robotsDelay?: number;
    selectors?: {
      item: string;
      link: string;
      title: string;
      date: string;
      excerpt: string;
    };
  }
  
  export interface ArticleRaw {
    sourceId: string;
    title: string;
    url: string;
    pubDate: string | null;
    description: string | null;
  }
  
export interface ArticleClean extends ArticleRaw {
  id: string;
  publisher: string;
  dateISO: string;
  score: number;
  pop?: number;
  star: boolean;
  embedding?: number[];
}
