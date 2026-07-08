import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  ConfluenceConfig,
  ConfluencePage,
  ConfluenceSpace,
  SearchResult,
  CreatePageRequest,
  UpdatePageRequest,
  PaginatedResult
} from './types.js';
import { validateSpaceAccess } from './config.js';
import { Logger } from './logger.js';

interface RequestWithMetadata extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
}

export class ConfluenceClient {
  private client: AxiosInstance;
  private config: ConfluenceConfig;
  private logger: Logger;
  private spaceCache: Map<string, ConfluenceSpace> = new Map();
  private spaceCacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(config: ConfluenceConfig) {
    this.config = config;
    this.logger = new Logger();

    // Confluence Server/Data Center: v1 REST API at /rest/api, authenticated
    // with a Bearer Personal Access Token (not the Basic-auth API tokens used by Cloud).
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api`,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request/response logging
    this.client.interceptors.request.use(async (request: RequestWithMetadata) => {
      const startTime = Date.now();
      request.metadata = { startTime };

      await this.logger.logRequest(
        request.method || 'unknown',
        request.url || '',
        request.params,
        request.data
      );

      if (config.debug) {
        console.log('Confluence API Request:', {
          method: request.method,
          url: request.url,
          params: request.params
        });
      }
      return request;
    });

    this.client.interceptors.response.use(
      async (response) => {
        const requestConfig = response.config as RequestWithMetadata;
        const duration = requestConfig.metadata?.startTime
          ? Date.now() - requestConfig.metadata.startTime
          : undefined;

        await this.logger.logResponse(
          response.config.method || 'unknown',
          response.config.url || '',
          response.status,
          response.data,
          duration
        );

        if (config.debug) {
          console.log('Confluence API Response:', {
            status: response.status,
            url: response.config.url
          });
        }
        return response;
      },
      async (error) => {
        await this.logger.logError(
          error.config?.method || 'unknown',
          error.config?.url || '',
          error
        );

        if (config.debug) {
          console.error('Confluence API Error:', {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url
          });
        }
        return Promise.reject(error);
      }
    );
  }

  async searchContent(
    query?: string,
    spaceKey?: string,
    limit = 25,
    title?: string,
    start = 0,
    bodyFormat?: string
  ): Promise<SearchResult> {
    // Build search conditions
    const searchConditions: string[] = [];

    if (query) {
      searchConditions.push(`text ~ "${query}"`);
    }

    if (title) {
      searchConditions.push(`title ~ "${title}"`);
    }

    // If neither query nor title provided, search for all content
    if (searchConditions.length === 0) {
      searchConditions.push('type = page');
    }

    const searchQuery = searchConditions.join(' AND ');

    // Set expand based on bodyFormat parameter
    let expandParam = 'version,space';
    if (bodyFormat) {
      const format = bodyFormat === 'view' ? 'body.view' : 'body.storage';
      expandParam += `,${format}`;
    }

    const params: any = {
      cql: searchQuery,
      limit,
      start,
      expand: expandParam
    };

    if (spaceKey) {
      if (!validateSpaceAccess(spaceKey, this.config.allowedSpaces)) {
        throw new Error(`Access denied to space: ${spaceKey}`);
      }
      params.cql = `space = "${spaceKey}" AND ${params.cql}`;
    } else {
      const allowedSpacesCql = this.config.allowedSpaces.map(space => `space = "${space}"`).join(' OR ');
      params.cql = `(${allowedSpacesCql}) AND ${params.cql}`;
    }

    const response: AxiosResponse<{ results: ConfluencePage[], start: number, limit: number, size: number, _links: any }> =
      await this.client.get('/search', { params });

    return {
      content: response.data.results,
      start: response.data.start,
      limit: response.data.limit,
      size: response.data.size,
      _links: response.data._links
    };
  }

  async getPage(pageId: string, bodyFormat?: string): Promise<ConfluencePage> {
    let expandParam = 'space,version';
    if (bodyFormat) {
      const format = bodyFormat === 'view' ? 'body.view' : 'body.storage';
      expandParam += `,${format}`;
    }

    const response: AxiosResponse<ConfluencePage> = await this.client.get(`/content/${pageId}`, {
      params: { expand: expandParam }
    });

    // Validate space access
    if (!response.data.space || !response.data.space.key) {
      throw new Error('Unable to determine page space for access validation');
    }

    if (!validateSpaceAccess(response.data.space.key, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${response.data.space.key}`);
    }

    return response.data;
  }

  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentId?: string
  ): Promise<ConfluencePage> {
    if (!validateSpaceAccess(spaceKey, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${spaceKey}`);
    }

    const pageData: CreatePageRequest = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    if (parentId) {
      pageData.ancestors = [{ id: parentId }];
    }

    const response: AxiosResponse<ConfluencePage> = await this.client.post('/content', pageData);
    return response.data;
  }

  async updatePage(
    pageId: string,
    title: string,
    content: string,
    version: number
  ): Promise<ConfluencePage> {
    const currentPage = await this.getPage(pageId);

    if (!currentPage.space || !currentPage.space.key) {
      throw new Error('Unable to determine page space for access validation');
    }

    if (!validateSpaceAccess(currentPage.space.key, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${currentPage.space.key}`);
    }

    const updateData: UpdatePageRequest = {
      id: pageId,
      type: 'page',
      title,
      space: { key: currentPage.space.key },
      version: { number: version },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    const response: AxiosResponse<ConfluencePage> = await this.client.put(`/content/${pageId}`, updateData);
    return response.data;
  }

  async deletePage(pageId: string): Promise<void> {
    const currentPage = await this.getPage(pageId);

    if (!currentPage.space || !currentPage.space.key) {
      throw new Error('Unable to determine page space for access validation');
    }

    if (!validateSpaceAccess(currentPage.space.key, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${currentPage.space.key}`);
    }

    await this.client.delete(`/content/${pageId}`);
  }

  async listSpaces(limit = 50, start = 0): Promise<PaginatedResult<ConfluenceSpace>> {
    const response: AxiosResponse<PaginatedResult<ConfluenceSpace>> = await this.client.get('/space', {
      params: { limit, start }
    });

    const filteredResults = response.data.results.filter(space =>
      validateSpaceAccess(space.key, this.config.allowedSpaces)
    );

    // Cache the spaces
    filteredResults.forEach(space => this.cacheSpace(space));

    return {
      ...response.data,
      results: filteredResults,
      size: filteredResults.length
    };
  }

  async getSpaceById(spaceId: string): Promise<ConfluenceSpace> {
    // Check if we have this space in cache by ID
    for (const [key, space] of this.spaceCache.entries()) {
      if (space.id === spaceId && this.isSpaceCacheValid(key)) {
        return space;
      }
    }

    // The v1 space API only supports lookup by key, so page through the
    // allowed spaces (same access-controlled listSpaces used elsewhere) to find it.
    let start = 0;
    const limit = 100;
    let space: ConfluenceSpace | undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const spaces = await this.listSpaces(limit, start);
      space = spaces.results.find(s => s.id === spaceId);
      if (space || spaces.results.length < limit) {
        break;
      }
      start += limit;
    }

    if (!space) {
      throw new Error(`Space not found: ${spaceId}`);
    }

    return space;
  }

  private isSpaceCacheValid(spaceKey: string): boolean {
    const expiry = this.spaceCacheExpiry.get(spaceKey);
    return expiry !== undefined && Date.now() < expiry;
  }

  private cacheSpace(space: ConfluenceSpace): void {
    const now = Date.now();
    this.spaceCache.set(space.key, space);
    this.spaceCacheExpiry.set(space.key, now + this.CACHE_TTL);
  }

  async getSpaceByKey(spaceKey: string): Promise<ConfluenceSpace> {
    if (!validateSpaceAccess(spaceKey, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${spaceKey}`);
    }

    // Check cache first
    if (this.isSpaceCacheValid(spaceKey)) {
      const cachedSpace = this.spaceCache.get(spaceKey);
      if (cachedSpace) {
        return cachedSpace;
      }
    }

    const response: AxiosResponse<ConfluenceSpace> = await this.client.get(`/space/${spaceKey}`);
    this.cacheSpace(response.data);

    return response.data;
  }

  async getSpaceContent(spaceKey: string, limit = 25, start = 0, bodyFormat?: string): Promise<PaginatedResult<ConfluencePage>> {
    if (!validateSpaceAccess(spaceKey, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${spaceKey}`);
    }

    let expandParam = 'version,space';
    if (bodyFormat) {
      const format = bodyFormat === 'view' ? 'body.view' : 'body.storage';
      expandParam += `,${format}`;
    }

    const response: AxiosResponse<PaginatedResult<ConfluencePage>> = await this.client.get('/content', {
      params: {
        spaceKey,
        type: 'page',
        limit,
        start,
        expand: expandParam
      }
    });

    return response.data;
  }

  async movePage(
    pageId: string,
    targetSpaceKey: string,
    parentId?: string
  ): Promise<ConfluencePage> {
    const currentPage = await this.getPage(pageId);

    if (!currentPage.space || !currentPage.space.key) {
      throw new Error('Unable to determine page space for access validation');
    }

    if (!validateSpaceAccess(currentPage.space.key, this.config.allowedSpaces)) {
      throw new Error(`Access denied to source space: ${currentPage.space.key}`);
    }

    if (!validateSpaceAccess(targetSpaceKey, this.config.allowedSpaces)) {
      throw new Error(`Access denied to target space: ${targetSpaceKey}`);
    }

    const moveData: UpdatePageRequest = {
      id: pageId,
      type: 'page',
      title: currentPage.title,
      space: { key: targetSpaceKey },
      version: { number: currentPage.version.number },
      body: {
        storage: {
          value: currentPage.body?.storage?.value ?? '',
          representation: 'storage'
        }
      }
    };

    if (parentId) {
      moveData.ancestors = [{ id: parentId }];
    }

    const response: AxiosResponse<ConfluencePage> = await this.client.put(`/content/${pageId}`, moveData);
    return response.data;
  }

  async getPageChildren(pageId: string, limit = 25, start = 0, bodyFormat?: string): Promise<PaginatedResult<ConfluencePage>> {
    const parentPage = await this.getPage(pageId);

    if (!parentPage.space || !parentPage.space.key) {
      throw new Error('Unable to determine page space for access validation');
    }

    if (!validateSpaceAccess(parentPage.space.key, this.config.allowedSpaces)) {
      throw new Error(`Access denied to space: ${parentPage.space.key}`);
    }

    let expandParam = 'version,space';
    if (bodyFormat) {
      const format = bodyFormat === 'view' ? 'body.view' : 'body.storage';
      expandParam += `,${format}`;
    }

    const response: AxiosResponse<PaginatedResult<ConfluencePage>> = await this.client.get(`/content/${pageId}/child/page`, {
      params: { limit, start, expand: expandParam }
    });

    return response.data;
  }
}
