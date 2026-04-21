export type Guide = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  youtubeUrl: string;
  isPaid: boolean;
  priceStars: number;
  duration: string;
  publishedAt: string;
  coverUrl: string;
};

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          [k: string]: unknown;
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        ready: () => void;
        expand: () => void;
        close: () => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          setText: (t: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          selectionChanged: () => void;
        };
        openLink: (url: string) => void;
        shareURL?: (url: string, text?: string) => void;
      };
    };
  }
}
