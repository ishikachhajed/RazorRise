import { AIProvider } from './AIProvider.js';
import { MockAIProvider } from './MockAIProvider.js';
import { GroqAIProvider } from './GroqAIProvider.js';
import { config } from '../config/index.js';

export class ProviderFactory {
  private static instance: AIProvider | null = null;

  static getProvider(): AIProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = config.aiProvider.toLowerCase();
    
    if (providerType === 'groq') {
      console.log(`[AI PROVIDER INITIALIZED] Using live 'GroqAIProvider' mode`);
      this.instance = new GroqAIProvider();
    } else {
      console.log(`[AI PROVIDER INITIALIZED] Using '${providerType}' mode (Fallback: MockAIProvider)`);
      this.instance = new MockAIProvider();
    }
    
    return this.instance;
  }
}
