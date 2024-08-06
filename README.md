# English Teacher

English Teacher is a Cloudflare Worker that automatically generates English learning materials based on the latest AI-related articles from MIT Technology Review. It fetches RSS feeds, extracts article content, generates English learning materials using AI, and sends the results to a Discord channel via webhook.

## Features

- Fetches the latest AI-related articles from MIT Technology Review's RSS feed
- Extracts full article content
- Generates English learning materials based on the article content using AI (Gemini API)
- Sends formatted messages with article information and learning materials to a Discord channel

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- A Cloudflare account
- A Discord webhook URL
- Google Cloud Platform account with Gemini API access

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/english-teacher.git
   cd english-teacher
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the `wrangler.toml.example` file to `wrangler.toml` and update it with your account details:
   ```
   cp wrangler.toml.example wrangler.toml
   ```

4. Set up your environment variables in `wrangler.toml`:
   ```toml
   [vars]
   DISCORD_WEBHOOK = "your_discord_webhook_url"
   GEMINI_API_KEY = "your_gemini_api_key"
   ```

## Usage

To run the worker locally:

```
wrangler dev
```

To deploy the worker to Cloudflare:

```
wrangler publish
```

## Configuration

The following environment variables need to be set:

- `DISCORD_WEBHOOK`: Your Discord webhook URL
- `GEMINI_API_KEY`: Your Google Gemini API key

You can set these in your `wrangler.toml` file for local development, and in the Cloudflare Dashboard for production.
