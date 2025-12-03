# SBP Portal Backend Server

Express.js backend for handling Seqera Platform workflow launches.

## Setup

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your Seqera Platform credentials
   ```

3. Run in development:

   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /api/workflows/bindflow` - Launch Bindflow workflow
- `GET /api/workflows/:runId` - Get workflow run status

## Environment Variables

Required variables in `.env`:

- `SEQERA_API_URL` - Seqera Platform API endpoint
- `SEQERA_ACCESS_TOKEN` - API access token
- `COMPUTE_ID` - Default compute environment ID
- `WORK_DIR` - Default work directory
- `REGION` - AWS region
- `WORK_SPACE` - Seqera workspace name
