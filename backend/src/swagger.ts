import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EPS Tracking Tool API',
      version: '1.0.0',
      description: 'REST API documentation for the EPS Tracking Tool backend.',
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Local development' },
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
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', minLength: 2 },
            role: { type: 'string', enum: ['MEMBER', 'TEAM_LEADER', 'VP'] },
            departmentId: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'otp', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            otp: { type: 'string', minLength: 6, maxLength: 6 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['MEMBER', 'TEAM_LEADER', 'VP'] },
            provider: { type: 'string', enum: ['LOCAL', 'GOOGLE'] },
            departmentId: { type: 'string', nullable: true },
            isDispatcher: { type: 'boolean' },
            isDisabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: { $ref: '#/components/schemas/UserResponse' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scan all route files for @openapi JSDoc annotations
  apis: ['./src/Presentation/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
