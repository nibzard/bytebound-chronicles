# Environment Variables

Bytebound Chronicles supports configuration through environment variables, which take precedence over `.env` file settings. This is useful for deployment, CI/CD, and development workflows.

## **Required Environment Variables**

### AI Configuration
- **`GOOGLE_AI_API_KEY`** - Your Google AI API key (required)
- **`ANTHROPIC_API_KEY`** - Your Anthropic API key (optional, for escalation scenarios)

## **Optional Environment Variables**

### Server Configuration  
- **`API_PORT`** - API server port (default: `3000`)
- **`API_HOST`** - API server host (default: `localhost`)
- **`NODE_ENV`** - Environment mode (`development`, `production`, `test`)

### Database Configuration
- **`DATABASE_PATH`** - Path to database files (default: `./data`)
- **`TURSO_URL`** - Turso database URL (optional, for cloud sync)
- **`TURSO_AUTH_TOKEN`** - Turso authentication token (optional)

## **Usage Examples**

### 1. Using Environment Variables Only

```bash
# Set your API keys
export GOOGLE_AI_API_KEY="your_google_ai_key_here"
export ANTHROPIC_API_KEY="your_anthropic_key_here"

# Run the TUI
npm run tui
```

### 2. Using Custom Port

```bash
export GOOGLE_AI_API_KEY="your_key"
export API_PORT=8080

npm run dev:all
```

### 3. Production Deployment

```bash
export NODE_ENV=production
export GOOGLE_AI_API_KEY="your_production_key"
export API_PORT=80
export DATABASE_PATH="/var/data/bytebound"

npm run build
npm start
```

### 4. Development with .env Fallback

```bash
# Create .env file with API keys
cp .env.example .env
# Edit .env with your keys

# Override specific settings via environment
export API_PORT=4000

npm run dev:all
```

## **Priority Order**

Configuration is loaded in this priority order:

1. **Environment variables** (highest priority)
2. **`.env` file** 
3. **Default values** (lowest priority)

## **Verification**

You can verify your environment variables are loaded correctly:

```bash
# Check if API keys are set
echo "Google AI Key: ${GOOGLE_AI_API_KEY:+SET}"
echo "Anthropic Key: ${ANTHROPIC_API_KEY:+SET}"

# Check server configuration
echo "API Port: ${API_PORT:-3000}"
echo "API Host: ${API_HOST:-localhost}"
```

## **Security Notes**

- **Never commit API keys** to version control
- Use environment variables in production deployments
- Consider using secret management systems for sensitive values
- The `.env` file should be added to `.gitignore` (already configured)

## **Troubleshooting**

### API Keys Not Working
```bash
# Verify your keys are set
env | grep -E "(GOOGLE_AI_API_KEY|ANTHROPIC_API_KEY)"

# Check if .env file exists and has keys
cat .env | grep -E "(GOOGLE_AI_API_KEY|ANTHROPIC_API_KEY)"
```

### Port Conflicts
```bash
# Check if port is in use
lsof -i :3000

# Use a different port
export API_PORT=8080
npm run tui
```

### Database Issues
```bash
# Reset database with custom path
export DATABASE_PATH="./custom_data"
npm run db:reset
```