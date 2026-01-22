# Database Environment Configuration

## Required Environment Variables

### DATABASE_URL (Required)

PostgreSQL connection string in the format:
```
postgresql://user:password@host:port/database
```

**Example:**
```
DATABASE_URL=postgresql://training:password@psql-training-dev-eastus2-001.postgres.database.azure.com:5432/training
```

### Optional Configuration

#### DB_POOL_MIN
Minimum number of connections in the pool.
- **Default**: `2`
- **Recommended**: `2` for development, `5` for production

#### DB_POOL_MAX
Maximum number of connections in the pool.
- **Default**: `10`
- **Recommended**: `10` for development, `20` for production with 70 concurrent users

#### DB_SSL
Enable SSL for database connections (required for Azure PostgreSQL).
- **Default**: `false` (auto-enabled in production)
- **Set to**: `true` for Azure PostgreSQL or other cloud providers

#### NODE_ENV
Environment mode (affects SSL and logging).
- **Values**: `development`, `production`
- **Default**: `development`

## Example .env File

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_SSL=true

# Application
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# JWT Secret (for auth)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

## Azure PostgreSQL Configuration

For Azure PostgreSQL, you typically need:
- SSL enabled (`DB_SSL=true`)
- Connection string from Azure Portal
- Firewall rules configured to allow your IP

## Testing the Connection

After setting up environment variables, test the connection:

```typescript
import { testConnection } from './core/db/pool';

// In your application startup
const connected = await testConnection();
if (!connected) {
  console.error('Failed to connect to database');
  process.exit(1);
}
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use environment-specific secrets** - Different credentials for dev/staging/prod
3. **Rotate credentials regularly** - Especially in production
4. **Use connection pooling** - Prevents connection exhaustion
5. **Enable SSL in production** - Encrypts data in transit
