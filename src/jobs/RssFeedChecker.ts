import { DiscordNotifier } from './DiscordNotifier';
import { Env } from '../index';

export class RssFeedChecker {
    constructor(private env: Env) { }

    async perform() {
        const feedUrl = 'https://www.technologyreview.com/topic/artificial-intelligence/feed';
        try {
            const rss = await this.fetchAndParseRSS(feedUrl);
            const item = rss.items[0];
            const content = await this.fetchAndExtractArticle(item.link);
            const englishMaterial = await this.generateEnglishMaterial(content);
            const articleEmbed: DiscordEmbed = {
                title: item.title.substring(0, 256),  // Max 256 characters
                url: item.link,
            };

            const englishMaterialEmbed: DiscordEmbed = {
                description: englishMaterial.substring(0, 4096)
            };

            const discordNotifier = new DiscordNotifier(this.env.DISCORD_WEBHOOK);
            await discordNotifier.perform({ 
                embeds: [articleEmbed, englishMaterialEmbed]
            });
        } catch (error) {
            console.error(`Error processing feed ${feedUrl}:`, error);
            // Attempt to send an error notification
            try {
                const errorEmbed: DiscordEmbed = {
                    title: "Error Processing RSS Feed",
                    description: error.message.substring(0, 2048),
                    color: 0xff0000, // Red color
                    timestamp: new Date().toISOString()
                };
                const discordNotifier = new DiscordNotifier(this.env.DISCORD_WEBHOOK);
                await discordNotifier.perform({ embeds: [errorEmbed] });
            } catch (notificationError) {
                console.error("Failed to send error notification:", notificationError);
            }
        }
    }

    async fetchAndParseRSS(url: string) {
        const response = await fetch(url);
        const text = await response.text();

        const channelRegex = /<channel>([\s\S]*?)<\/channel>/;
        const channelMatch = text.match(channelRegex);
        const channelContent = channelMatch ? channelMatch[1] : '';

        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const items = [];
        let itemMatch;
        while ((itemMatch = itemRegex.exec(text)) !== null) {
            items.push(itemMatch[1]);
        }

        return {
            title: this.extractTag(channelContent, 'title'),
            description: this.extractTag(channelContent, 'description'),
            link: this.extractTag(channelContent, 'link'),
            items: items.map(item => ({
                title: this.extractTag(item, 'title'),
                link: this.extractTag(item, 'link'),
                description: this.extractTag(item, 'description') || "",
                pubDate: this.extractTag(item, 'pubDate'),
                guid: this.extractTag(item, 'guid') || this.extractTag(item, 'link'),
            }))
        };
    }

    extractTag(content: string, tagName: string) {
        const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    }

    async fetchAndExtractArticle(url: string) {
        const parsedUrl = new URL(url);
        const relativeUrl = parsedUrl.pathname;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch page: ${response.statusText}`);
            }

            const html = await response.text();

            // Extract preloaded state using regex
            const preloadStateRegex = /window\.__PRELOADED_STATE__\s*=\s*({.*?});/s;
            const preloadStateMatch = html.match(preloadStateRegex);

            if (preloadStateMatch && preloadStateMatch[1]) {
                try {
                    const preloadedState = JSON.parse(preloadStateMatch[1]);
                    // this.logJsonStructure(preloadedState, relativeUrl);
                    const htmlContent = this.extractHtmlContent(preloadedState, relativeUrl);

                    if (htmlContent) {
                        const textContent = this.extractTextFromHtml(htmlContent);
                        return textContent.trim();
                    } else {
                        console.error("Failed to extract HTML content from preloaded state");
                    }
                } catch (error) {
                    console.error("JSON parsing or content extraction failed:", error);
                }
            } else {
                console.error("Failed to extract JSON from script");
            }
        } catch (error) {
            console.error("fetchAndExtractArticle Error:", error);
        }
        return "Failed to extract article content.";
    }

    extractHtmlContent(preloadedState: any, relativeUrl: string): string | null {
        try {
            const components = preloadedState?.components;
            if (!components || !components.page || !components.page[relativeUrl]) {
                console.error("Required structure not found in preloaded state");
                return null;
            }

            const pageData = components.page[relativeUrl];
            console.log("Searching for content in page data...");

            const findContent = (node: any, path: string = ''): string | null => {
                if (node && typeof node === 'object') {
                    if (node.config && node.config.content) {
                        return node.config.content;
                    }
                    if (Array.isArray(node)) {
                        for (let i = 0; i < node.length; i++) {
                            const content = findContent(node[i], `${path}[${i}]`);
                            if (content) return content;
                        }
                    } else {
                        for (const key in node) {
                            const content = findContent(node[key], path ? `${path}.${key}` : key);
                            if (content) return content;
                        }
                    }
                }
                return null;
            };

            const content = findContent(pageData);
            if (content) {
                console.log("Content found successfully");
                return content;
            } else {
                console.error("No content found in the page data");
                return null;
            }
        } catch (error) {
            console.error("Error extracting HTML content:", error);
            return null;
        }
    }

    extractTextFromHtml(html: string): string {
        // Remove HTML tags
        let text = html.replace(/<[^>]*>/g, ' ');
        // Replace multiple spaces with a single space
        text = text.replace(/\s+/g, ' ');
        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        return text.trim();
    }

    async generateEnglishMaterial(content: string): Promise<string> {
        const prompt = `**Prompt: Extract Essential Vocabulary and Expressions**

**Objective:**  
Help Japanese learners improve their English reading skills by extracting and translating essential words, phrases, and expressions from an English article. The output should include the original text, its translation into Japanese, and the context in which it is used.

**Instructions:**  

1. **Input Article:**  
   Provide the full text of the English article you want to analyze.

2. **Identify Key Elements:**  
   - **Words:** Select important vocabulary that is crucial for understanding the article.
   - **Phrases:** Identify common and article-specific phrases that enhance comprehension.
   - **Expressions:** Include any idiomatic or AI-related expressions used in the article.
   - **Slang:** Extract any slang terms that may appear in the text.

3. **Output Format:**  
   For each identified element, provide the following:
   - **Original Text:** The word, phrase, or expression in English.
   - **Japanese Translation:** A direct translation or an explanation in Japanese.
   - **Contextual Sentence:** An example sentence from the article that shows how the word or phrase is used.

   
**Example Output:**

1. **Word:**  
- Artificial Intelligence: 人工知能
- Context: Artificial Intelligence is transforming industries worldwide.

2. **Phrase:**  
- Break the ice: 緊張をほぐす
- Context: The speaker told a joke to break the ice before the presentation.

3. **Expression:**  
- Think outside the box: 型にはまらない考え方をする
- Context: To solve the problem, we need to think outside the box.

4. **Slang:**  
- Hit the nail on the head: 図星を突く
- Context: Her analysis really hit the nail on the head.

**Output Tips:**

- Ensure the Japanese translation accurately reflects the meaning in the article's context.
- Highlight any cultural nuances that may affect comprehension.
- Include notes on usage if relevant.

**Submission:**  
Paste the full text of the article below to begin the analysis.

${content}
`;
        try {
            const output = await this.getGeminiResponse(prompt, 'gemini-1.5-flash');
            return output;
        } catch (error) {
            console.error('Error generating output:', error);
            return 'Failed to generate output.';
        }
    }

    async getGeminiResponse(prompt: string, model: string): Promise<string> {
        try {
            const apiKey = this.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('Gemini API key is missing');
            }

            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        // "maxOutputTokens": 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error(`Error in getGeminiResponse (${model}):`, error);
            throw error;
        }
    }
}
