export interface ConfluenceConfig {
  baseUrl: string;
  apiToken: string;
  allowedSpaces: string[];
  debug?: boolean;
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space: {
    key: string;
    name: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  version: {
    number: number;
    when: string;
    by: {
      displayName: string;
      email: string;
    };
  };
  _links: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  _links: {
    webui: string;
    self: string;
  };
}

export interface SearchResult {
  content: ConfluencePage[];
  start: number;
  limit: number;
  size: number;
  _links: {
    next?: string;
    prev?: string;
  };
}

export interface CreatePageRequest {
  type: string;
  title: string;
  space: {
    key: string;
  };
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  ancestors?: Array<{
    id: string;
  }>;
}

export interface UpdatePageRequest {
  id: string;
  type: string;
  title: string;
  space: {
    key: string;
  };
  version: {
    number: number;
  };
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  ancestors?: Array<{
    id: string;
  }>;
}

export interface PaginatedResult<T> {
  results: T[];
  start: number;
  limit: number;
  size: number;
  _links: {
    next?: string;
    prev?: string;
    base?: string;
    context?: string;
    self?: string;
  };
}