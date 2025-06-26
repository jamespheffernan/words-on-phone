import { PhraseCategory } from '../data/phrases';
import { env } from '../config/environment';
import { detectActiveAIService, type AIService } from '../config/environment';
import { PhraseScorer, type PhraseScore } from './phraseScorer';

interface CustomCategoryRequest {
  id: string;
  categoryName: string;
  requestedAt: number;
  sampleWords: string[];
  phrasesGenerated: number;
  status: 'pending' | 'confirmed' | 'generated' | 'failed';
  error?: string;
  description?: string;
  tags?: string[];
}

interface FetchedPhrase {
  phraseId: string;
  text: string;
  category: PhraseCategory;
  source: 'openai' | 'gemini'; // Updated to support both
  fetchedAt: number;
  difficulty?: "easy" | "medium" | "hard"; // Added difficulty support
}

interface CustomCategoryPhrase extends Omit<FetchedPhrase, 'category'> {
  customCategory: string;
  category: PhraseCategory.EVERYTHING; // Custom phrases go in "Everything" category
  qualityScore?: number; // Total quality score (0-100)
  qualityBreakdown?: PhraseScore['breakdown']; // Detailed scoring breakdown
}

// Gemini API Response Interface
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// OpenAI CustomTerm interface
interface CustomTerm {
  id: string;
  topic?: string;
  phrase: string;
  difficulty?: "easy" | "medium" | "hard";
}

// Dynamic API URL selection based on active service
const getApiUrl = async (): Promise<{ url: string; service: AIService }> => {
  const activeService = await detectActiveAIService();
  
  if (activeService === 'openai') {
    return { url: env.OPENAI_API_URL, service: 'openai' };
  } else if (activeService === 'gemini') {
    return { url: env.GEMINI_API_URL, service: 'gemini' };
  } else {
    throw new Error('No AI service available');
  }
};

const DAILY_QUOTA_LIMIT = env.DAILY_CATEGORY_QUOTA;
const SAMPLE_WORDS_COUNT = 3;
const PHRASES_PER_CATEGORY = env.PHRASES_PER_CATEGORY;
const TOTAL_PHRASES_PER_CATEGORY = env.TOTAL_PHRASES_PER_CATEGORY;

// UUID generation for OpenAI requests
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Storage keys
const DAILY_CATEGORY_USAGE_KEY = 'dailyCategoryUsage';

export class CategoryRequestService {
  private dbName = 'words-on-phone-categories';
  private requestsStoreName = 'categoryRequests';
  private phrasesStoreName = 'customPhrases';
  private phraseScorer: PhraseScorer;

  constructor() {
    this.phraseScorer = new PhraseScorer();
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Requests store
        if (!db.objectStoreNames.contains(this.requestsStoreName)) {
          const requestsStore = db.createObjectStore(this.requestsStoreName, { keyPath: 'id' });
          requestsStore.createIndex('requestedAt', 'requestedAt', { unique: false });
          requestsStore.createIndex('status', 'status', { unique: false });
        }

        // Custom phrases store
        if (!db.objectStoreNames.contains(this.phrasesStoreName)) {
          const phrasesStore = db.createObjectStore(this.phrasesStoreName, { keyPath: 'phraseId' });
          phrasesStore.createIndex('customCategory', 'customCategory', { unique: false });
          phrasesStore.createIndex('fetchedAt', 'fetchedAt', { unique: false });
        }
      };
    });
  }

  async canMakeRequest(): Promise<{ canMake: boolean; reason?: string; remainingToday: number }> {
    try {
      const today = new Date().toDateString();
      const usageData = (await this.getFromStorage(DAILY_CATEGORY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
      
      // Reset counter if it's a new day
      if (usageData.date !== today) {
        await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { date: today, count: 0 });
        return { canMake: true, remainingToday: DAILY_QUOTA_LIMIT };
      }
      
      const remaining = DAILY_QUOTA_LIMIT - usageData.count;
      
      if (remaining <= 0) {
        return { 
          canMake: false, 
          reason: 'Daily limit reached. Try again tomorrow.', 
          remainingToday: 0 
        };
      }
      
      return { canMake: true, remainingToday: remaining };
    } catch (error) {
      console.warn('Error checking request quota:', error);
      return { canMake: true, remainingToday: DAILY_QUOTA_LIMIT };
    }
  }

  async requestSampleWords(categoryName: string): Promise<string[]> {
    const quotaCheck = await this.canMakeRequest();
    if (!quotaCheck.canMake) {
      throw new Error(quotaCheck.reason || 'Cannot make request at this time');
    }

    // Create request record
    const requestId = this.generateRequestId(categoryName);
    const request: CustomCategoryRequest = {
      id: requestId,
      categoryName,
      requestedAt: Date.now(),
      sampleWords: [],
      phrasesGenerated: 0,
      status: 'pending',
      description: '',
      tags: [],
    };

    await this.saveRequest(request);

    try {
      // Get the active AI service
      const { url: apiUrl, service } = await getApiUrl();
      
      let sampleWords: string[];
      
      if (service === 'openai') {
        // Use OpenAI format
        sampleWords = await this.requestSampleWordsFromOpenAI(categoryName, apiUrl);
      } else {
        // Use Gemini format
        sampleWords = await this.requestSampleWordsFromGemini(categoryName, apiUrl);
      }

      if (sampleWords.length < 2) {
        throw new Error('Could not generate enough sample words. Please try a different category.');
      }

      // Update request with sample words
      request.sampleWords = sampleWords.slice(0, SAMPLE_WORDS_COUNT);
      request.status = 'confirmed';
      await this.saveRequest(request);

      // Increment daily usage
      await this.incrementDailyUsage();

      return request.sampleWords;
    } catch (error) {
      request.status = 'failed';
      request.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveRequest(request);
      throw error;
    }
  }

  private async requestSampleWordsFromOpenAI(categoryName: string, apiUrl: string): Promise<string[]> {
    const phraseIds = Array.from({ length: SAMPLE_WORDS_COUNT }, () => generateUUID());
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: categoryName,
        batchSize: SAMPLE_WORDS_COUNT,
        phraseIds: phraseIds
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if ('error' in data) {
      throw new Error(`OpenAI API error: ${data.error}`);
    }

    if (!Array.isArray(data)) {
      throw new Error('OpenAI response is not an array');
    }

    return data.map((term: CustomTerm) => term.phrase);
  }

  private async requestSampleWordsFromGemini(categoryName: string, apiUrl: string): Promise<string[]> {
    const prompt = `You are PhraseMachine, a generator of sample words for party game categories.

TASK:
Generate exactly ${SAMPLE_WORDS_COUNT} example words or short phrases for the category "${categoryName}". These are preview samples to show users what this category contains.

RULES:
- Each should be 1-3 words maximum  
- Family-friendly only (no profanity, politics, or adult themes)
- Representative examples that clearly belong to "${categoryName}"
- Choose the most recognizable, popular items from this category
- Return only the items, one per line, no numbering or formatting

Begin.`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        category: categoryName
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const responseText = data.candidates[0]?.content?.parts[0]?.text || '';
    
    return this.parseWordsFromResponse(responseText);
  }

  async generateFullCategory(categoryName: string, sampleWords: string[], description?: string, tags?: string[]): Promise<CustomCategoryPhrase[]> {
    // Find existing request
    const requestId = this.generateRequestId(categoryName);
    let existingRequest = await this.getRequest(requestId);
    
    if (!existingRequest) {
      // Create a new request if it doesn't exist (fallback)
      existingRequest = {
        id: requestId,
        categoryName,
        requestedAt: Date.now(),
        sampleWords,
        phrasesGenerated: 0,
        status: 'confirmed',
        description: description || '',
        tags: tags || [],
      };
      await this.saveRequest(existingRequest);
    }

    // update metadata if provided
    if (description) existingRequest.description = description;
    if (tags) existingRequest.tags = tags;

    try {
      // Get the active AI service
      const { url: apiUrl, service } = await getApiUrl();
      
      // Generate phrases using parallel batching strategy
      const phrases = await this.generatePhrasesWithBatching(categoryName, apiUrl, service);

      // Deduplicate phrases
      const deduplicatedPhrases = await this.deduplicateCustomPhrases(phrases);
      
      if (deduplicatedPhrases.length === 0) {
        throw new Error('No new phrases generated after deduplication. Please try a different category.');
      }

      // Save phrases to storage
      await this.saveCustomPhrases(deduplicatedPhrases);

      // Update request status
      existingRequest.status = 'generated';
      existingRequest.phrasesGenerated = deduplicatedPhrases.length;
      await this.saveRequest(existingRequest);

      return deduplicatedPhrases;
    } catch (error) {
      existingRequest.status = 'failed';
      existingRequest.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveRequest(existingRequest);
      throw error;
    }
  }

  private async generatePhrasesWithBatching(categoryName: string, apiUrl: string, service: AIService): Promise<CustomCategoryPhrase[]> {
    console.log(`🚀 Starting parallel batch generation for category: ${categoryName}`);
    
    // Launch 3 parallel batch requests
    const batchPromises = Array.from({ length: 3 }, (_, index) => 
      this.generateSingleBatch(categoryName, apiUrl, service, index + 1)
    );
    
    // Wait for all batches to complete (or fail)
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect successful batches
    const allPhrases: CustomCategoryPhrase[] = [];
    let successfulBatches = 0;
    
    for (const [index, result] of batchResults.entries()) {
      if (result.status === 'fulfilled') {
        allPhrases.push(...result.value);
        successfulBatches++;
        console.log(`✅ Batch ${index + 1} succeeded with ${result.value.length} phrases`);
      } else {
        console.warn(`❌ Batch ${index + 1} failed:`, result.reason);
      }
    }
    
    if (successfulBatches === 0) {
      throw new Error('All batch requests failed. Please try again.');
    }
    
    // Deduplicate across batches using a Set
    const uniquePhrases = this.deduplicateAcrossBatches(allPhrases);
    console.log(`🔄 After deduplication: ${uniquePhrases.length} unique phrases from ${allPhrases.length} total`);
    
    // If we have fewer than target, try additional sequential batches (max 1 retry)
    if (uniquePhrases.length < TOTAL_PHRASES_PER_CATEGORY && successfulBatches < 4) {
      console.log(`📈 Attempting retry batch to reach ${TOTAL_PHRASES_PER_CATEGORY} phrases...`);
      try {
        const retryBatch = await this.generateSingleBatch(categoryName, apiUrl, service, 4);
        const combinedPhrases = [...uniquePhrases, ...retryBatch];
        const finalUniquePhrases = this.deduplicateAcrossBatches(combinedPhrases);
        console.log(`✅ Retry batch added ${finalUniquePhrases.length - uniquePhrases.length} new unique phrases`);
        return finalUniquePhrases;
      } catch (error) {
        console.warn('❌ Retry batch failed:', error);
      }
    }
    
    console.log(`🎯 Final result: ${uniquePhrases.length} unique phrases generated`);
    return uniquePhrases;
  }

  private async generateSingleBatch(categoryName: string, apiUrl: string, service: AIService, batchNumber: number): Promise<CustomCategoryPhrase[]> {
    console.log(`📦 Generating batch ${batchNumber} for ${categoryName}...`);
    
    if (service === 'openai') {
      const phrases = await this.generatePhrasesBatchFromOpenAI(categoryName, apiUrl);
      // Increment daily usage for this batch
      await this.incrementDailyUsage();
      return phrases;
    } else {
      const phrases = await this.generatePhrasesBatchFromGemini(categoryName, apiUrl);
      // Increment daily usage for this batch
      await this.incrementDailyUsage();
      return phrases;
    }
  }

  private deduplicateAcrossBatches(phrases: CustomCategoryPhrase[]): CustomCategoryPhrase[] {
    const seenTexts = new Set<string>();
    const uniquePhrases: CustomCategoryPhrase[] = [];
    
    for (const phrase of phrases) {
      const normalizedText = phrase.text.toLowerCase();
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniquePhrases.push(phrase);
      }
    }
    
    return uniquePhrases;
  }

  private async generatePhrasesBatchFromOpenAI(categoryName: string, apiUrl: string): Promise<CustomCategoryPhrase[]> {
    const startTime = Date.now();
    console.log(`📝 Generating OpenAI batch for ${categoryName}`);

    const phraseIds = Array.from({ length: PHRASES_PER_CATEGORY }, () => generateUUID());
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: categoryName,
        batchSize: PHRASES_PER_CATEGORY,
        phraseIds: phraseIds
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if ('error' in data) {
      throw new Error(`OpenAI API error: ${data.error}`);
    }

    if (!Array.isArray(data)) {
      throw new Error('OpenAI response is not an array');
    }

    // Score phrases and add quality metrics
    const scoredPhrases: CustomCategoryPhrase[] = [];
    const qualityMetrics = {
      totalGenerated: data.length,
      highQuality: 0,
      mediumQuality: 0,
      lowQuality: 0,
      averageScore: 0
    };

    for (const term of data) {
      try {
        // Use local scoring only for speed
        const scoreResult = await this.phraseScorer.scorePhrase(term.phrase, categoryName, false, false);
        
        const customPhrase: CustomCategoryPhrase = {
          phraseId: term.id,
          text: term.phrase,
          customCategory: categoryName,
          category: PhraseCategory.EVERYTHING,
          source: 'openai' as const,
          fetchedAt: Date.now(),
          difficulty: term.difficulty,
          qualityScore: scoreResult.totalScore,
          qualityBreakdown: scoreResult.breakdown
        };

        scoredPhrases.push(customPhrase);

        // Update quality metrics
        if (scoreResult.totalScore >= 60) {
          qualityMetrics.highQuality++;
        } else if (scoreResult.totalScore >= 40) {
          qualityMetrics.mediumQuality++;
        } else {
          qualityMetrics.lowQuality++;
        }

      } catch (error) {
        console.warn(`Failed to score OpenAI phrase "${term.phrase}":`, error);
        // Add phrase without scoring as fallback
        scoredPhrases.push({
          phraseId: term.id,
          text: term.phrase,
          customCategory: categoryName,
          category: PhraseCategory.EVERYTHING,
          source: 'openai' as const,
          fetchedAt: Date.now(),
          difficulty: term.difficulty,
          qualityScore: 30, // Conservative fallback
          qualityBreakdown: { localHeuristics: 30, categoryBoost: 0, error: 'Scoring failed' }
        });
        qualityMetrics.lowQuality++;
      }
    }

    qualityMetrics.averageScore = scoredPhrases.reduce((sum, p) => sum + (p.qualityScore || 30), 0) / scoredPhrases.length;
    const totalTime = Date.now() - startTime;

    console.log(`📊 OpenAI quality metrics for ${categoryName}:`, {
      ...qualityMetrics,
      highQualityPercentage: `${((qualityMetrics.highQuality / qualityMetrics.totalGenerated) * 100).toFixed(1)}%`,
      totalTime: `${totalTime}ms`
    });

    // Sort by quality score (best first)
    scoredPhrases.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

    return scoredPhrases;
  }

  private async generatePhrasesBatchFromGemini(categoryName: string, apiUrl: string, retryAttempt: number = 0): Promise<CustomCategoryPhrase[]> {
    const startTime = Date.now();
    console.log(`📝 Generating batch for ${categoryName} (attempt ${retryAttempt + 1})`);

    // Enhanced prompt with quality focus
    const prompt = `You are PhraseMachine, an expert generator of party game phrases for "Words on Phone" - a charades-style game where players act out, draw, or describe phrases for their team to guess.

GAME CONTEXT:
- Players have 60 seconds to get their team to guess as many phrases as possible
- Phrases must be ACTABLE (can be mimed/gestured), DRAWABLE (can be sketched), or DESCRIBABLE (can be explained without saying the words)
- Good phrases are instantly recognizable when acted out or described
- Players range from teens to adults at parties, family gatherings, game nights

TASK:
Generate exactly 15 HIGH-QUALITY phrases for category "${categoryName}". Each phrase must be perfect for party gameplay and score highly on recognition and fun factor.

QUALITY CRITERIA:
✅ EXCELLENT EXAMPLES (aim for these):
- "Pizza Delivery" (easy to act out - pretend to drive, carry box, ring doorbell)
- "Taylor Swift" (widely known, easy to describe/act)
- "Brushing Teeth" (clear physical action)
- "Harry Potter" (universally recognized, easy to describe)
- "Breaking Bad" (popular TV show, easy to act out)
- "McDonald's" (globally recognized, easy to mime)

❌ AVOID THESE:
- "Quantum Physics" (too technical, hard to act)
- "Municipal Governance" (boring, not party-friendly)
- "Existential Dread" (abstract, not fun)
- "Obscure 1970s Band" (too niche)
- "Complex Medical Procedure" (too technical)
- "Philosophy Concept" (too abstract)

SPECIFIC RULES:
1. 2-4 words maximum (shorter = better for gameplay)
2. Must be instantly recognizable to 80%+ of people
3. No profanity, politics, or adult themes
4. Avoid overly technical or academic terms
5. Prioritize pop culture, common activities, famous people/places
6. Test: "Could a teenager easily act this out at a party?"
7. Focus on FUN, RECOGNIZABLE, and ACTABLE phrases

CATEGORY FOCUS: ${categoryName}
Make sure every phrase clearly belongs to "${categoryName}" and would be obvious to players.

OUTPUT FORMAT:
Return ONLY valid JSON array:
[
  "First phrase",
  "Second phrase",
  "Third phrase"
]

Generate exactly 15 phrases now:`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        category: categoryName
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const responseText = data.candidates[0]?.content?.parts[0]?.text || '';
    
    const rawPhrases = this.parsePhrasesFromResponse(responseText);
    console.log(`🎯 Generated ${rawPhrases.length} raw phrases`);

    // Score all phrases with local heuristics only for speed
    const scoredPhrases: CustomCategoryPhrase[] = [];
    const qualityMetrics = {
      totalGenerated: rawPhrases.length,
      highQuality: 0, // score >= 60
      mediumQuality: 0, // score 40-59
      lowQuality: 0, // score < 40
      averageScore: 0,
      scoringTime: 0
    };

    const scoringStartTime = Date.now();
    
    for (const phrase of rawPhrases) {
      try {
        // Use local scoring only for speed (no Wikipedia/Reddit)
        const scoreResult = await this.phraseScorer.scorePhrase(phrase, categoryName, false, false);
        
        const customPhrase: CustomCategoryPhrase = {
          phraseId: this.generatePhraseId(phrase, categoryName),
          text: phrase,
          customCategory: categoryName,
          category: PhraseCategory.EVERYTHING,
          source: 'gemini' as const,
          fetchedAt: Date.now(),
          qualityScore: scoreResult.totalScore,
          qualityBreakdown: scoreResult.breakdown
        };

        scoredPhrases.push(customPhrase);

        // Update quality metrics
        if (scoreResult.totalScore >= 60) {
          qualityMetrics.highQuality++;
        } else if (scoreResult.totalScore >= 40) {
          qualityMetrics.mediumQuality++;
        } else {
          qualityMetrics.lowQuality++;
        }

      } catch (error) {
        console.warn(`Failed to score phrase "${phrase}":`, error);
        // Add phrase without scoring as fallback
        scoredPhrases.push({
          phraseId: this.generatePhraseId(phrase, categoryName),
          text: phrase,
          customCategory: categoryName,
          category: PhraseCategory.EVERYTHING,
          source: 'gemini' as const,
          fetchedAt: Date.now(),
          qualityScore: 30, // Conservative fallback score
          qualityBreakdown: { localHeuristics: 30, categoryBoost: 0, error: 'Scoring failed' }
        });
        qualityMetrics.lowQuality++;
      }
    }

    qualityMetrics.scoringTime = Date.now() - scoringStartTime;
    qualityMetrics.averageScore = scoredPhrases.reduce((sum, p) => sum + (p.qualityScore || 30), 0) / scoredPhrases.length;

    const highQualityPercentage = (qualityMetrics.highQuality / qualityMetrics.totalGenerated) * 100;
    const totalTime = Date.now() - startTime;

    console.log(`📊 Quality metrics for ${categoryName}:`, {
      ...qualityMetrics,
      highQualityPercentage: `${highQualityPercentage.toFixed(1)}%`,
      totalTime: `${totalTime}ms`
    });

    // Check if we need to retry (less than 50% high quality phrases and haven't exceeded max retries)
    const needsRetry = highQualityPercentage < 50 && retryAttempt < 2 && totalTime < 7000; // Allow retry if under 7s

    if (needsRetry) {
      console.log(`🔄 Retrying batch for ${categoryName} - only ${highQualityPercentage.toFixed(1)}% high quality`);
      return this.generatePhrasesBatchFromGemini(categoryName, apiUrl, retryAttempt + 1);
    }

    // Sort by quality score (best first) and return all phrases
    scoredPhrases.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    
    console.log(`✅ Completed batch for ${categoryName}: ${qualityMetrics.highQuality}/${qualityMetrics.totalGenerated} high quality (${highQualityPercentage.toFixed(1)}%)`);
    return scoredPhrases;
  }

  async getCustomPhrases(): Promise<CustomCategoryPhrase[]> {
    return this.getAllCustomPhrasesFromDB();
  }

  async getCustomPhrasesByCategory(categoryName: string): Promise<string[]> {
    const allCustomPhrases = await this.getCustomPhrases();
    return allCustomPhrases
      .filter(phrase => phrase.customCategory === categoryName)
      .map(phrase => phrase.text);
  }

  async getAllCustomCategories(): Promise<string[]> {
    const allCustomPhrases = await this.getCustomPhrases();
    const categories = new Set(allCustomPhrases.map(phrase => phrase.customCategory));
    return Array.from(categories).sort();
  }

  async deleteCustomCategory(categoryName: string): Promise<void> {
    try {
      // Get all phrases for this category
      const phrasesToDelete = await this.getCustomPhrasesByCategory(categoryName);
      
      if (phrasesToDelete.length === 0) {
        console.warn(`No phrases found for category: ${categoryName}`);
        return;
      }

      // Delete phrases from database
      await this.deleteCustomPhrasesFromDB(categoryName);
      
      // Delete any associated request records
      await this.deleteRequestByCategory(categoryName);
      
      console.log(`Deleted ${phrasesToDelete.length} phrases from category: ${categoryName}`);
    } catch (error) {
      console.error(`Failed to delete custom category ${categoryName}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private parseWordsFromResponse(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 50)
      .slice(0, SAMPLE_WORDS_COUNT);
  }

  private parsePhrasesFromResponse(response: string): string[] {
    // Try to parse as JSON first (new PhraseMachine format)
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonArray = JSON.parse(jsonMatch[0]);
        if (Array.isArray(jsonArray)) {
          return jsonArray
            .map(phrase => String(phrase).trim())
            .filter(phrase => phrase.length > 0 && phrase.length <= 100)
            .slice(0, PHRASES_PER_CATEGORY);
        }
      }
    } catch (error) {
      console.log('Response not in JSON format, falling back to line-by-line parsing');
    }

    // Fallback to line-by-line parsing (legacy format)
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length <= 100)
      .slice(0, PHRASES_PER_CATEGORY);
  }

  private generateRequestId(categoryName: string): string {
    // Use deterministic ID based only on category name (no timestamp)
    return `req_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private generatePhraseId(text: string, category: string): string {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const categoryPrefix = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `custom_${categoryPrefix}_${normalized}_${Date.now()}`;
  }

  private async deduplicateCustomPhrases(newPhrases: CustomCategoryPhrase[]): Promise<CustomCategoryPhrase[]> {
    const existingPhrases = await this.getAllCustomPhrasesFromDB();
    const existingTexts = new Set(existingPhrases.map(p => p.text.toLowerCase()));

    return newPhrases.filter(phrase => 
      !existingTexts.has(phrase.text.toLowerCase())
    );
  }

  private async incrementDailyUsage(): Promise<void> {
    const today = new Date().toDateString();
    const usageData = (await this.getFromStorage(DAILY_CATEGORY_USAGE_KEY) as { date: string; count: number } | null) || { date: today, count: 0 };
    
    if (usageData.date !== today) {
      await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { date: today, count: 1 });
    } else {
      await this.setInStorage(DAILY_CATEGORY_USAGE_KEY, { 
        date: today, 
        count: usageData.count + 1 
      });
    }
  }

  // Database operations
  private async saveRequest(request: CustomCategoryRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readwrite');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const putRequest = store.put(request);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getRequest(requestId: string): Promise<CustomCategoryRequest | null> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readonly');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const getRequest = store.get(requestId);
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async saveCustomPhrases(phrases: CustomCategoryPhrase[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readwrite');
        const store = transaction.objectStore(this.phrasesStoreName);
        
        let completed = 0;
        const total = phrases.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        phrases.forEach(phrase => {
          const addRequest = store.put(phrase);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) resolve();
          };
          
          addRequest.onerror = () => {
            completed++;
            if (completed === total) resolve();
          };
        });
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getAllCustomPhrasesFromDB(): Promise<CustomCategoryPhrase[]> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readonly');
        const store = transaction.objectStore(this.phrasesStoreName);
        
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async getFromStorage(key: string): Promise<unknown> {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  private async setInStorage(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private async deleteCustomPhrasesFromDB(categoryName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.phrasesStoreName], 'readwrite');
        const store = transaction.objectStore(this.phrasesStoreName);
        const index = store.index('customCategory');
        
        const getRequest = index.getAll(categoryName);
        
        getRequest.onsuccess = () => {
          const phrases = getRequest.result;
          let deletedCount = 0;
          
          if (phrases.length === 0) {
            resolve();
            return;
          }
          
          phrases.forEach(phrase => {
            const deleteRequest = store.delete(phrase.phraseId);
            
            deleteRequest.onsuccess = () => {
              deletedCount++;
              if (deletedCount === phrases.length) {
                resolve();
              }
            };
            
            deleteRequest.onerror = () => {
              deletedCount++;
              if (deletedCount === phrases.length) {
                resolve();
              }
            };
          });
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }

  private async deleteRequestByCategory(categoryName: string): Promise<void> {
    const requestId = this.generateRequestId(categoryName);
    
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(this.dbName, 1);
      
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction([this.requestsStoreName], 'readwrite');
        const store = transaction.objectStore(this.requestsStoreName);
        
        const deleteRequest = store.delete(requestId);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve(); // Don't fail if request doesn't exist
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  }
}

// Singleton instance
export const categoryRequestService = new CategoryRequestService(); 