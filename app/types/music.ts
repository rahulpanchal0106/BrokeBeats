export interface Track {
  title: string;
  artist: string;
  filepath: string;
  duration?: number;
}

export interface User {
  spotifyId: string;
  personalLibrary: Track[];
}

export interface Metadata {
  [key: string]: {
    title: string;
    artist: string;
  };
} 