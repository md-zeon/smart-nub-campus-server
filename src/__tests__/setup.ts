import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.BETTER_AUTH_SECRET = "test-secret-key-for-integration-tests";
process.env.BETTER_AUTH_URL = "http://localhost:3001";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.MAIL_PROVIDER = "resend";
