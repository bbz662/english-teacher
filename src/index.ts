import { RssFeedChecker } from "./jobs/RssFeedChecker";

export interface Env {
    DISCORD_WEBHOOK: string;
    GEMINI_API_KEY: string;
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        try {
            const rssFeedChecker = new RssFeedChecker(env);
            await rssFeedChecker.perform();
            console.log("Scheduled RSS check completed successfully");
        } catch (error) {
            console.error("Error in scheduled RSS check:", error);
        }
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        try {
            if (url.pathname === "/feed-check" && request.method === "GET") {
                const rssFeedChecker = new RssFeedChecker(env);
                await rssFeedChecker.perform();
                return new Response("Scheduled RSS check completed successfully", {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }

            return new Response("Not Found", { status: 404 });
        } catch (error) {
            console.error("Error processing request:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    }
};
