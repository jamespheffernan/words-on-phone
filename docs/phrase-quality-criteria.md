# Phrase Quality Criteria and Curation Guidelines

**Version**: 1.0  
**Date**: January 15, 2025  
**Based on**: Analysis of 712 current phrases (avg quality: 9.7/10)

## Quality Scoring System

### Excellent Quality (9-10 points)
- **Cultural Recognition**: Widely recognized names, brands, events, or concepts
- **Appropriate Length**: 8-25 characters optimal for readability  
- **Clear Context**: Unambiguous meaning that most players will understand
- **Proper Formatting**: Correct capitalization, punctuation, and spacing
- **Family-Friendly**: Safe for all ages and social situations

**Examples from current database:**
- "The Godfather" (10/10) - Iconic movie, perfect length, universally known
- "Super Bowl" (10/10) - Major cultural event, short and memorable
- "Taylor Swift" (10/10) - Contemporary cultural relevance

### Good Quality (7-8 points)  
- **Recognizable**: Known by most people but may have regional variations
- **Reasonable Length**: 5-30 characters, still easily readable
- **Clear Meaning**: Context is apparent with minimal ambiguity
- **Well-Formatted**: Proper presentation with minor formatting issues acceptable

**Examples:**
- "Ed Sheeran" (9.7/10) - Well-known artist, clear pronunciation
- "Grand Canyon" (9.7/10) - Famous landmark, appropriate difficulty

### Average Quality (5-6 points)
- **Somewhat Known**: Recognized by many but not universal
- **Acceptable Length**: Up to 35 characters
- **Some Ambiguity**: May require cultural context
- **Basic Formatting**: Understandable despite minor issues

### Poor Quality (<5 points)
- **Generic/Placeholder**: Contains "Sample Phrase" or "Word Number" patterns
- **Too Obscure**: Limited recognition outside specific groups
- **Poor Length**: Too short (<5 chars) or too long (>35 chars)
- **Formatting Issues**: Poor capitalization, unclear presentation

## Difficulty Classification

### Easy (Target: 25% of database)
**Characteristics:**
- Short phrases (5-12 characters)
- Single words or simple combinations
- Universal recognition
- Common vocabulary

**Current Status**: 16% (116/712) - **NEEDS IMPROVEMENT**

**Examples:**
- "Olympics" - Single concept, universally known
- "Pizza" - Simple food item
- "Music" - Basic category

### Medium (Target: 50% of database)  
**Characteristics:**
- Moderate length (10-20 characters)
- 2-3 words typically
- Good cultural recognition
- May include proper nouns

**Current Status**: 83% (592/712) - **OVERREPRESENTED**

**Examples:**
- "Taylor Swift" - Two words, well-known
- "Star Wars" - Cultural icon
- "Ice Cream" - Common concept

### Hard (Target: 25% of database)
**Characteristics:**
- Longer phrases (20+ characters)
- Complex concepts or specific references
- May require cultural knowledge
- Multiple words or technical terms

**Current Status**: 1% (4/712) - **SEVERELY UNDERREPRESENTED**

**Examples:**
- "The Lord of the Rings" - Long title, specific reference
- "Martin Luther King Jr." - Historical figure with long name

## Content Guidelines

### Inclusivity and Diversity
- **Cultural Representation**: Include global perspectives, not just Western
- **Demographic Balance**: Represent diverse ages, backgrounds, interests
- **Language Sensitivity**: Avoid slang, offensive terms, or exclusionary language
- **Accessibility**: Consider phrases that work for different skill levels

### Contemporary Relevance  
- **Current Events**: Include recent but established cultural phenomena
- **Technology Integration**: Modern terms that are now mainstream
- **Generational Balance**: Mix of classic and contemporary references
- **Seasonal Appropriateness**: Some phrases can be seasonal/thematic

### Category Balance Requirements

Based on audit findings, each category should have:

#### Minimum Viable Category (MVP)
- **100+ phrases per category** (currently only 10)
- **Difficulty distribution**: 25% easy, 50% medium, 25% hard
- **Type variety**: Mix of proper nouns, general terms, single words, events

#### Target Category (10x Goal)  
- **500+ phrases per category** for rich replay value
- **Subcategory diversity**: Different eras, styles, regions within each category
- **Quality distribution**: 80% excellent, 15% good, 5% average

## Category-Specific Guidelines

### Movies & TV
- Include classics, contemporary hits, different genres
- Mix of movies, TV shows, actors, directors
- International content, not just Hollywood

### Music & Artists  
- Various genres and eras
- Solo artists, bands, albums, songs
- Global music representation

### Sports & Athletes
- Different sports, not just major American leagues
- International competitions and athletes
- Both individual and team sports

### Food & Drink
- Global cuisines and dishes
- Basic ingredients to complex preparations
- Beverages, snacks, meals

### Places & Travel
- Mix of countries, cities, landmarks
- Natural and man-made attractions
- Different scales (continents to neighborhoods)

### Famous People
- Historical and contemporary figures
- Different fields (science, politics, arts, etc.)
- Global representation

### Technology & Science
- Established tech terms and concepts
- Scientific discoveries and phenomena
- Both consumer and specialized technology

### History & Events
- Different time periods and civilizations
- Major events, wars, discoveries
- Cultural and scientific milestones

### Entertainment & Pop Culture
- Awards shows, festivals, venues
- Media platforms and formats
- Contemporary cultural phenomena

### Nature & Animals
- Diverse ecosystems and environments
- Various animal species and behaviors
- Natural phenomena and geography

## Curation Process

### Phase 1: Automated Screening
1. **Length Check**: 5-35 characters
2. **Format Check**: Proper capitalization and punctuation
3. **Profanity Filter**: Basic inappropriate content detection
4. **Duplicate Detection**: Against existing database

### Phase 2: Quality Assessment
1. **Recognition Test**: Would 70%+ of target audience know this?
2. **Appropriateness Review**: Family-friendly and inclusive?
3. **Difficulty Classification**: Easy/Medium/Hard assignment
4. **Category Fit**: Does it belong in the assigned category?

### Phase 3: Human Review
1. **Cultural Sensitivity Check**: Potentially offensive or exclusive?
2. **Contemporary Relevance**: Still relevant and recognizable?
3. **Quality Score Assignment**: 1-10 scale
4. **Final Approval**: Include in database?

## Gold Standard Examples (Top 20% Quality)

Based on current analysis, these represent our highest quality phrases:

**Movies & TV**: "The Godfather", "Star Wars", "Breaking Bad"
**Music**: "The Beatles", "Taylor Swift", "Bruno Mars"  
**Sports**: "Super Bowl", "World Cup", "Olympics"
**Food**: "Pizza", "Ice Cream", "Chocolate"
**Places**: "New York City", "Paris", "Grand Canyon"
**People**: "Albert Einstein", "Steve Jobs", "Shakespeare"
**Technology**: "Smartphone", "Internet", "Social Media"
**History**: "World War II", "Moon Landing", "Renaissance"
**Entertainment**: "Academy Awards", "Broadway", "Netflix"
**Nature**: "Amazon Rainforest", "Northern Lights", "Blue Whale"

## Implementation Notes

- **Batch Processing**: Generate 15-30 phrases per API call (Netlify timeout limit)
- **Quality Threshold**: Minimum 7/10 quality score for inclusion
- **Testing**: A/B test new phrases against existing ones
- **Monitoring**: Track play frequency and user engagement per phrase
- **Updates**: Monthly review and refresh of lowest-performing phrases

---

*This document should be updated regularly based on user feedback, cultural changes, and database performance metrics.*