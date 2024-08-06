export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    timestamp?: string;
}

export class DiscordNotifier {
    constructor(private webhookUrl: string) { }

    async perform(payload: { content?: string; embeds: DiscordEmbed[] }) {
        const { content, embeds } = payload;

        // Validate each embed
        embeds.forEach(embed => {
            if (!embed.title && !embed.description) {
                throw new Error("Each embed must contain either a title or description");
            }

            // Ensure timestamp is in ISO8601 format
            if (embed.timestamp) {
                try {
                    embed.timestamp = new Date(embed.timestamp).toISOString();
                } catch (error) {
                    console.warn("Invalid timestamp format, removing timestamp");
                    delete embed.timestamp;
                }
            }

            // Truncate field values if they're too long
            if (embed.fields) {
                embed.fields = embed.fields.map(field => ({
                    ...field,
                    name: field.name.substring(0, 256),  // Max 256 characters
                    value: field.value.substring(0, 1024)  // Max 1024 characters
                }));
            }
        });

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    embeds: embeds
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Discord API responded with status ${response.status}: ${errorText}`);
            }
            console.log(`Notification sent with ${embeds.length} embeds`);
        } catch (error) {
            console.error("Error sending notification to Discord:", error);
            throw error;
        }
    }
}
