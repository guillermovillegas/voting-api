/**
 * Swagger/OpenAPI Configuration
 *
 * Generates OpenAPI 3.1 specification and serves Swagger UI.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

// ============================================================================
// OPENAPI SPECIFICATION
// ============================================================================

const swaggerSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Hackathon Voting API',
    version: '1.0.0',
    description: 'REST API for hackathon voting application with real-time WebSocket support',
  },
  servers: [
    {
      url: 'https://voting-api-lcvw.onrender.com',
      description: 'Production server',
    },
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
        description: 'Enter your JWT access token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'voter'] },
          teamId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          presentationOrder: { type: 'integer', nullable: true },
          hasPresented: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Vote: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          teamId: { type: 'string', format: 'uuid' },
          isFinalVote: { type: 'boolean' },
          publicNote: { type: 'string', nullable: true },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
      LeaderboardEntry: {
        type: 'object',
        properties: {
          teamId: { type: 'string', format: 'uuid' },
          teamName: { type: 'string' },
          voteCount: { type: 'string' },
          rank: { type: 'string' },
          hasPresented: { type: 'boolean' },
        },
      },
      TimerState: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
          durationSeconds: { type: 'integer' },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          pausedAt: { type: 'string', format: 'date-time', nullable: true },
          elapsedSeconds: { type: 'integer' },
          currentPresentationId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          code: { type: 'string' },
          status: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check if the API is running',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, description: 'Must contain uppercase, lowercase, number, and special character' },
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already registered' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful, returns tokens' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'New tokens returned' },
          '401': { description: 'Invalid refresh token' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },
    '/api/v1/auth/password': {
      put: {
        tags: ['Authentication'],
        summary: 'Change password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password changed' },
          '401': { description: 'Current password incorrect' },
        },
      },
    },
    '/api/v1/teams': {
      get: {
        tags: ['Teams'],
        summary: 'Get all teams',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of teams',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Team' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Create team (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  memberIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Team created' },
          '403': { description: 'Admin access required' },
          '409': { description: 'Team name already exists' },
        },
      },
    },
    '/api/v1/teams/{teamId}': {
      get: {
        tags: ['Teams'],
        summary: 'Get team by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Team data' },
          '404': { description: 'Team not found' },
        },
      },
      patch: {
        tags: ['Teams'],
        summary: 'Update team (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  presentationOrder: { type: 'integer' },
                  hasPresented: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Team updated' },
          '403': { description: 'Admin access required' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Delete team (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Team deleted' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/teams/{teamId}/members': {
      get: {
        tags: ['Teams'],
        summary: 'Get team with members',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Team with member list' },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Add members to team (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['memberIds'],
                properties: {
                  memberIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Members added' },
          '403': { description: 'Admin access required' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Remove members from team (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['memberIds'],
                properties: {
                  memberIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Members removed' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/votes': {
      post: {
        tags: ['Voting'],
        summary: 'Submit vote',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['teamId', 'isFinalVote'],
                properties: {
                  teamId: { type: 'string', format: 'uuid' },
                  isFinalVote: { type: 'boolean' },
                  publicNote: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Vote submitted' },
          '400': { description: 'Voting is closed' },
          '422': { description: 'Already voted or self-vote attempted' },
        },
      },
    },
    '/api/v1/votes/me': {
      get: {
        tags: ['Voting'],
        summary: 'Get my votes',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User votes and final vote status' },
        },
      },
    },
    '/api/v1/votes/status': {
      get: {
        tags: ['Voting'],
        summary: 'Check if voting is open',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Voting status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isOpen: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/votes/rankings': {
      get: {
        tags: ['Voting'],
        summary: 'Get my rankings and notes',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User rankings for all presented teams' },
        },
      },
    },
    '/api/v1/votes/notes': {
      put: {
        tags: ['Voting'],
        summary: 'Update private note for team',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['teamId', 'note', 'ranking'],
                properties: {
                  teamId: { type: 'string', format: 'uuid' },
                  note: { type: 'string', maxLength: 1000 },
                  ranking: { type: 'integer', minimum: 1, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Note saved' },
        },
      },
    },
    '/api/v1/votes/notes/export': {
      get: {
        tags: ['Voting'],
        summary: 'Export notes as JSON or CSV',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' } },
        ],
        responses: {
          '200': { description: 'Exported notes' },
        },
      },
    },
    '/api/v1/votes/teams/{teamId}/count': {
      get: {
        tags: ['Voting'],
        summary: 'Get vote count for team',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Vote count for the team' },
        },
      },
    },
    '/api/v1/votes/admin/toggle': {
      post: {
        tags: ['Voting'],
        summary: 'Toggle voting open/closed (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Voting status toggled' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Get current rankings',
        description: 'No authentication required',
        responses: {
          '200': {
            description: 'Leaderboard entries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LeaderboardEntry' },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/leaderboard/stats': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Get leaderboard statistics',
        description: 'No authentication required',
        responses: {
          '200': { description: 'Stats including total teams, votes, and top team' },
        },
      },
    },
    '/api/v1/leaderboard/{teamId}': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Get team leaderboard entry',
        description: 'No authentication required',
        parameters: [
          { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Team leaderboard entry' },
          '404': { description: 'Team not found' },
        },
      },
    },
    '/api/v1/presentations': {
      get: {
        tags: ['Presentations'],
        summary: 'Get all presentations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of presentations' },
        },
      },
    },
    '/api/v1/presentations/current': {
      get: {
        tags: ['Presentations'],
        summary: 'Get current presentation',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current presentation or null' },
        },
      },
    },
    '/api/v1/presentations/upcoming': {
      get: {
        tags: ['Presentations'],
        summary: 'Get upcoming presentations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of upcoming presentations' },
        },
      },
    },
    '/api/v1/presentations/completed': {
      get: {
        tags: ['Presentations'],
        summary: 'Get completed presentations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of completed presentations' },
        },
      },
    },
    '/api/v1/presentations/status': {
      get: {
        tags: ['Presentations'],
        summary: 'Get full queue status',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current, upcoming, and completed presentations' },
        },
      },
    },
    '/api/v1/presentations/initialize': {
      post: {
        tags: ['Presentations'],
        summary: 'Initialize presentation queue (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Queue initialized' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/presentations/{id}/start': {
      post: {
        tags: ['Presentations'],
        summary: 'Start presentation (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Presentation started' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/presentations/next': {
      post: {
        tags: ['Presentations'],
        summary: 'Advance to next presentation (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Advanced to next presentation' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/presentations/reset': {
      post: {
        tags: ['Presentations'],
        summary: 'Reset presentation queue (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Queue reset' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/timer': {
      get: {
        tags: ['Timer'],
        summary: 'Get timer state',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current timer state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TimerState' },
              },
            },
          },
        },
      },
    },
    '/api/v1/timer/start': {
      post: {
        tags: ['Timer'],
        summary: 'Start timer (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  durationSeconds: { type: 'integer', default: 300 },
                  presentationId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Timer started' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/timer/pause': {
      post: {
        tags: ['Timer'],
        summary: 'Pause timer (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Timer paused' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/timer/resume': {
      post: {
        tags: ['Timer'],
        summary: 'Resume timer (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Timer resumed' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/v1/timer/reset': {
      post: {
        tags: ['Timer'],
        summary: 'Reset timer (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Timer reset' },
          '403': { description: 'Admin access required' },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoint' },
    { name: 'Authentication', description: 'User authentication and token management' },
    { name: 'Teams', description: 'Team management' },
    { name: 'Voting', description: 'Vote submission and tracking' },
    { name: 'Leaderboard', description: 'Real-time leaderboard (no auth required)' },
    { name: 'Presentations', description: 'Presentation queue management' },
    { name: 'Timer', description: 'Presentation timer control' },
  ],
};

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
  app.get('/api/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export { swaggerSpec };
