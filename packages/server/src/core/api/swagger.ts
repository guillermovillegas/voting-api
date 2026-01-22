/**
 * Swagger/OpenAPI Configuration
 *
 * Generates OpenAPI 3.1 specification and serves Swagger UI.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

// ============================================================================
// OPENAPI CONFIGURATION
// ============================================================================

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Hackathon Voting API',
      version: '1.0.0',
      description: 'REST API for hackathon voting application',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
            },
            code: {
              type: 'string',
            },
            status: {
              type: 'number',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ============================================================================
// SWAGGER UI SETUP
// ============================================================================

export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Hackathon Voting API Documentation',
  }));

  // Serve OpenAPI JSON
  app.get('/api/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve OpenAPI YAML
  app.get('/api/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(toYaml(swaggerSpec));
  });
}

export { swaggerSpec };

function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => `${pad}- ${toYaml(item, indent + 1).replace(/^(\s*)/, '')}`)
      .join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, val]) => {
        const rendered = toYaml(val, indent + 1);
        const isComplex =
          typeof val === 'object' && val !== null && (Array.isArray(val) ? val.length > 0 : true);
        return isComplex
          ? `${pad}${key}:\n${pad}  ${rendered.replace(/\n/g, `\n${pad}  `)}`
          : `${pad}${key}: ${rendered}`;
      })
      .join('\n');
  }
  return JSON.stringify(String(value));
}
