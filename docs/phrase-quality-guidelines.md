# Phrase Quality Guidelines

## Overview

This document defines the quality standards and guidelines for phrase generation in the Words on Phone party game. It serves as a reference for both automated scoring systems and manual reviewers.

## Core Quality Principles

### 1. Recognizability
Phrases should be widely known and understood by a general audience.

**✅ Good Examples:**
- "Pizza Delivery" - Universal concept
- "Taylor Swift" - Widely known celebrity  
- "Netflix" - Popular platform

**❌ Poor Examples:**
- "Epistemological Framework" - Academic jargon
- "Byzantine Empire" - Too historical/niche
- "Quantum Entanglement" - Technical concept

### 2. Party Game Suitability
Phrases must work well in social party game contexts like charades.

**✅ Good Examples:**
- "Cooking Dinner" - Easy to act out
- "Video Call" - Relatable action
- "Dog Walking" - Clear visual concept

**❌ Poor Examples:**
- "Abstract Thinking" - Hard to visualize
- "Economic Theory" - Not actionable
- "Philosophical Debate" - Too complex

### 3. Appropriate Complexity
Balance between being interesting and accessible.

**✅ Good Examples:**
- "Basketball Player" - Specific but clear
- "Coffee Shop" - Detailed but familiar
- "Netflix Binge" - Specific cultural reference

**❌ Poor Examples:**
- "Sports" - Too generic
- "Neurosurgical Procedure" - Too specific/technical
- "Thing" - Not descriptive enough

### 4. Currency and Relevance
Prefer contemporary, relevant content when possible.

**✅ Good Examples:**
- "TikTok Dance" - Current platform
- "Zoom Meeting" - Recent cultural shift
- "Electric Car" - Modern concept

**❌ Poor Examples:**
- "Telegraph Message" - Outdated technology
- "Feudal System" - Historical concept
- "Rotary Phone" - Obsolete technology

## Scoring System

### Automated Scoring (0-100 points)

#### Local Heuristics (0-40 points)
- **Word Simplicity** (+10): 1-2 syllable words preferred
- **Common Words** (+10): Basic English vocabulary
- **Recent Content** (+15): References to 2020-2025 timeframe
- **Platform/Brand Names** (+10): Recognizable companies/services
- **Trending Elements** (+5): Viral or popular content markers

#### Wikipedia Validation (0-30 points)
- **Has Wikidata Entry** (+20): Concept exists in knowledge base
- **Multi-language Articles** (+5): 10+ Wikipedia language versions
- **High Visibility** (+5): Many cross-references and sitelinks

#### Reddit Validation (0-15 points)
*Applied only to borderline phrases (40-60 points)*
- **High Engagement** (+15): Posts with 1000+ upvotes
- **Medium Engagement** (+10): Posts with 100+ upvotes  
- **Recent Mentions** (+5): Active discussion

#### Category Modifiers (-5 to +15 points)
- **Movies & TV** (+10): High visual recognition
- **Food & Drink** (+10): Universal experiences
- **Sports** (+8): Physical activities
- **Music** (+8): Audio/rhythm based
- **Science & Technology** (-5): Often too technical

### Quality Thresholds

| Score Range | Classification | Action |
|-------------|---------------|---------|
| 80-100 | Excellent | Auto-accept |
| 60-79 | Good | Accept |
| 40-59 | Borderline | Manual review recommended |
| 20-39 | Poor | Warning flag |
| 0-19 | Unacceptable | Auto-reject |

## Manual Review Guidelines

### When to Review
- Automated score between 40-59 points
- Phrases containing sensitive content
- Technical terms in non-technical categories
- Cultural references that may not be universal

### Review Criteria

#### ✅ Approve If:
- Players would likely recognize the phrase
- Suitable for acting out or describing
- Culturally appropriate for diverse audiences
- Fits the category context
- Provides good gameplay experience

#### ❌ Reject If:
- Too technical or academic
- Potentially offensive or inappropriate  
- Extremely niche or obscure
- Poor fit for party game context
- Likely to confuse or frustrate players

#### 🔄 Modify If:
- Close to acceptable but needs minor adjustment
- Can be simplified while maintaining meaning
- Cultural reference needs localization

### Override Reasons
When manually overriding automated scores, select appropriate reason:

**Approval Overrides:**
- "Cultural relevance despite low score"
- "Perfect for game context"
- "Popular but not in Wikipedia"
- "Local/regional significance"

**Rejection Overrides:**  
- "Too technical despite high score"
- "Inappropriate for party context"
- "Outdated reference"
- "Poor gameplay experience"

## Category-Specific Guidelines

### Movies & TV
- Prefer recent releases and popular franchises
- Include mix of genres and eras
- Avoid extremely niche or art house content
- Consider international appeal

### Food & Drink
- Focus on universal foods and common dishes
- Include variety of cuisines and dietary types
- Avoid overly technical cooking terms
- Consider cultural food traditions

### Sports
- Mix popular and niche sports
- Include both professional and recreational activities  
- Consider seasonal and regional variations
- Balance individual and team sports

### Music
- Include variety of genres and eras
- Mix artists, songs, and musical concepts
- Consider both mainstream and influential content
- Include instruments and music activities

### Science & Technology
- Focus on consumer technology and everyday science
- Avoid highly technical terminology
- Prefer concepts with visual or practical aspects
- Include popular science and tech trends

## Quality Assurance Process

### Automated Pipeline
1. **Generation**: Enhanced prompts with quality guidance
2. **Scoring**: Multi-component automated evaluation
3. **Filtering**: Remove obviously unsuitable phrases
4. **Ranking**: Sort by quality score for review

### Manual Review Process
1. **Borderline Review**: Human evaluation of 40-59 point phrases
2. **Context Check**: Verify category fit and appropriateness
3. **Gameplay Test**: Consider actual party game experience
4. **Final Decision**: Approve, reject, or modify

### Continuous Improvement
- **Feedback Loop**: User reports feed back into scoring system
- **Score Calibration**: Adjust thresholds based on performance
- **Prompt Evolution**: Refine generation prompts based on results
- **Category Tuning**: Adjust category-specific modifiers

## Implementation Notes

### Performance Targets
- **Generation Speed**: <2 seconds per 15-phrase batch
- **Quality Rate**: >70% of generated phrases score 60+ points
- **Review Efficiency**: <30 seconds per manual review
- **User Satisfaction**: >4.0/5.0 average rating

### Monitoring Metrics
- Average quality scores by category
- Manual override frequency and reasons
- User feedback on phrase appropriateness
- Gameplay success rates with generated content

### Rollback Strategy
If quality degrades:
1. **Immediate**: Revert to previous working prompts
2. **Short-term**: Enable higher manual review thresholds
3. **Long-term**: Analyze and fix underlying issues
4. **Recovery**: Gradual re-deployment with monitoring

## Maintenance Schedule

- **Weekly**: Review manual override patterns and quality metrics
- **Monthly**: Analyze user feedback and adjust thresholds
- **Quarterly**: Comprehensive review of guidelines and examples
- **Annually**: Major review of scoring system and categories

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-26  
**Next Review**: 2025-07-26 