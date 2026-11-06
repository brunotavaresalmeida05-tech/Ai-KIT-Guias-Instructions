const errorResponse = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AI Development System API',
    version: '2.0.0',
    description:
      'HTTP API for Strix workflows, Claude-Mem storage, Taste-Skill catalog and Laya Hub events.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  tags: [
    { name: 'System' },
    { name: 'Workflows' },
    { name: 'Memory' },
    { name: 'Skills' },
    { name: 'Events' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      BearerAuth: { type: 'http', scheme: 'bearer' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
      TaskDefinition: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', example: 'echo' },
          payload: {},
          requiredSkills: { type: 'array', items: { type: 'string' } },
          priority: { type: 'integer', minimum: 1, maximum: 10 },
          retries: { type: 'integer', minimum: 0, maximum: 5 },
          dependencies: { type: 'array', items: { type: 'string' } },
          timeout: { type: 'integer', minimum: 1, maximum: 300000 },
        },
      },
      WorkflowDefinition: {
        type: 'object',
        required: ['name', 'tasks'],
        properties: {
          name: { type: 'string' },
          strategy: { type: 'string', enum: ['sequential', 'parallel', 'hybrid'] },
          tasks: { type: 'array', items: { $ref: '#/components/schemas/TaskDefinition' } },
          metadata: { type: 'object' },
        },
      },
      MemoryDocument: {
        type: 'object',
        required: ['content', 'sessionId'],
        properties: {
          content: { type: 'string' },
          sessionId: { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: ['context', 'instruction', 'feedback', 'result', 'reference', 'content'],
          },
          metadata: { type: 'object' },
        },
      },
      Event: {
        type: 'object',
        required: ['source', 'type', 'title'],
        properties: {
          source: {
            type: 'string',
            enum: ['github', 'slack', 'email', 'webhook', 'database', 'api', 'workflow', 'system'],
          },
          type: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          payload: { type: 'object' },
          priority: { type: 'integer', minimum: 1, maximum: 10 },
          metadata: { type: 'object' },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/metrics': {
      get: {
        tags: ['System'],
        summary: 'Prometheus metrics',
        security: [],
        responses: { '200': { description: 'Metrics in text exposition format' } },
      },
    },
    '/api/system/stats': {
      get: {
        tags: ['System'],
        summary: 'Runtime statistics',
        responses: { '200': { description: 'Runtime statistics' }, '401': errorResponse },
      },
    },
    '/api/workflows': {
      get: {
        tags: ['Workflows'],
        summary: 'List executed workflows',
        responses: { '200': { description: 'Workflow list' }, '401': errorResponse },
      },
      post: {
        tags: ['Workflows'],
        summary: 'Create and execute a workflow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowDefinition' },
            },
          },
        },
        responses: {
          '201': { description: 'Workflow executed' },
          '400': errorResponse,
          '401': errorResponse,
        },
      },
    },
    '/api/workflows/{id}': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Workflow' }, '404': errorResponse },
      },
    },
    '/api/memory/sessions': {
      post: {
        tags: ['Memory'],
        summary: 'Create memory session',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  ttl: { type: 'integer', minimum: 60 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Session created' }, '401': errorResponse },
      },
    },
    '/api/memory/documents': {
      post: {
        tags: ['Memory'],
        summary: 'Store a memory document',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryDocument' },
            },
          },
        },
        responses: { '201': { description: 'Document stored' }, '400': errorResponse },
      },
    },
    '/api/memory/search': {
      get: {
        tags: ['Memory'],
        summary: 'Semantic search',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'sessionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['context', 'instruction', 'feedback', 'result', 'reference', 'content'],
            },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } },
          { name: 'similarity', in: 'query', schema: { type: 'number', minimum: 0, maximum: 1 } },
        ],
        responses: { '200': { description: 'Search results' }, '400': errorResponse },
      },
    },
    '/api/skills': {
      get: {
        tags: ['Skills'],
        summary: 'List skills',
        responses: { '200': { description: 'Skill catalog' } },
      },
    },
    '/api/skills/validate': {
      post: {
        tags: ['Skills'],
        summary: 'Validate skill catalog',
        responses: { '200': { description: 'Validation report' } },
      },
    },
    '/api/skills/{id}': {
      get: {
        tags: ['Skills'],
        summary: 'Get skill by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Skill' }, '404': errorResponse },
      },
    },
    '/api/skills/{id}/execute': {
      post: {
        tags: ['Skills'],
        summary: 'Execute an executable skill',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { input: { type: 'object' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Skill output' },
          '400': errorResponse,
          '404': errorResponse,
        },
      },
    },
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        responses: { '200': { description: 'Event list' } },
      },
      post: {
        tags: ['Events'],
        summary: 'Ingest an event',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Event' },
            },
          },
        },
        responses: { '201': { description: 'Event ingested' }, '400': errorResponse },
      },
    },
    '/api/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get event status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Event status' }, '404': errorResponse },
      },
    },
    '/api/events/{id}/actions/{actionId}': {
      post: {
        tags: ['Events'],
        summary: 'Execute an action for an event',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'actionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { params: { type: 'object' } } },
            },
          },
        },
        responses: { '200': { description: 'Action result' }, '400': errorResponse },
      },
    },
  },
};
