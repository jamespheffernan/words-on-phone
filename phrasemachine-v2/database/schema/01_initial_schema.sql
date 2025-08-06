-- PhraseMachine v2 Database Schema
-- Version: 1.0.0
-- Created: 2025-01-29
-- Description: Comprehensive schema for phrase storage, scoring history, and system metrics

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================
-- CORE TABLES
-- ================================

-- Phrases table - Core phrase storage with metadata
CREATE TABLE phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phrase TEXT NOT NULL,
    phrase_normalized TEXT NOT NULL, -- Lowercase, trimmed version for deduplication
    word_count INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    source VARCHAR(100) NOT NULL DEFAULT 'manual', -- 'manual', 'llm_generated', 'imported'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100), -- User/system identifier
    generation_session_id UUID, -- Link to generation session if LLM-generated
    
    -- Status and flags
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'rejected'
    is_approved BOOLEAN DEFAULT false,
    quality_reviewed BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT phrases_phrase_not_empty CHECK (LENGTH(TRIM(phrase)) > 0),
    CONSTRAINT phrases_word_count_positive CHECK (word_count > 0),
    CONSTRAINT phrases_category_valid CHECK (category IN ('general', 'pop_culture', 'food', 'sports')),
    CONSTRAINT phrases_status_valid CHECK (status IN ('active', 'archived', 'rejected')),
    CONSTRAINT phrases_unique_normalized UNIQUE (phrase_normalized)
);

-- Phrase scores table - Historical scoring data for all phrases
CREATE TABLE phrase_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phrase_id UUID NOT NULL REFERENCES phrases(id) ON DELETE CASCADE,
    
    -- Component scores (0-25 for most, 0-30 for legacy, 0-20+ for cultural)
    distinctiveness_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    describability_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    legacy_heuristics_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    cultural_validation_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Final unified score (0-100)
    final_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    quality_classification VARCHAR(20) NOT NULL,
    decision_recommendation VARCHAR(20) NOT NULL,
    
    -- Scoring metadata
    scoring_algorithm_version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scoring_duration_ms INTEGER,
    scorer_instance VARCHAR(100), -- Which service instance performed scoring
    
    -- Component details (JSON for detailed breakdown)
    distinctiveness_details JSONB,
    describability_details JSONB,
    legacy_heuristics_details JSONB,
    cultural_validation_details JSONB,
    
    -- Constraints
    CONSTRAINT phrase_scores_distinctiveness_range CHECK (distinctiveness_score >= 0 AND distinctiveness_score <= 25),
    CONSTRAINT phrase_scores_describability_range CHECK (describability_score >= 0 AND describability_score <= 25),
    CONSTRAINT phrase_scores_legacy_range CHECK (legacy_heuristics_score >= 0 AND legacy_heuristics_score <= 30),
    CONSTRAINT phrase_scores_cultural_range CHECK (cultural_validation_score >= 0 AND cultural_validation_score <= 25),
    CONSTRAINT phrase_scores_final_range CHECK (final_score >= 0 AND final_score <= 100),
    CONSTRAINT phrase_scores_quality_valid CHECK (quality_classification IN ('excellent', 'good', 'acceptable', 'poor', 'unacceptable')),
    CONSTRAINT phrase_scores_decision_valid CHECK (decision_recommendation IN ('auto_accept', 'likely_accept', 'conditional_accept', 'likely_reject', 'auto_reject'))
);

-- Generation sessions table - LLM generation session tracking
CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session parameters
    category VARCHAR(50) NOT NULL,
    count_requested INTEGER NOT NULL,
    quality_target VARCHAR(20) NOT NULL,
    use_feedback BOOLEAN DEFAULT false,
    generation_type VARCHAR(50) NOT NULL DEFAULT 'single', -- 'single', 'batch', 'diverse_batch', 'feedback_loop'
    
    -- Session results
    phrases_generated INTEGER DEFAULT 0,
    phrases_accepted INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5,2),
    acceptance_rate DECIMAL(5,2),
    
    -- Performance metrics
    total_duration_ms INTEGER,
    generation_duration_ms INTEGER,
    scoring_duration_ms INTEGER,
    generation_attempts INTEGER DEFAULT 1,
    
    -- Session metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    
    -- LLM configuration
    llm_model VARCHAR(100),
    llm_temperature DECIMAL(3,2),
    prompt_template_version VARCHAR(20),
    
    -- Additional session data
    session_config JSONB, -- Full configuration used
    session_results JSONB, -- Detailed results and metrics
    error_details JSONB, -- Error information if failed
    
    -- Constraints
    CONSTRAINT generation_sessions_category_valid CHECK (category IN ('general', 'pop_culture', 'food', 'sports')),
    CONSTRAINT generation_sessions_quality_valid CHECK (quality_target IN ('good', 'excellent')),
    CONSTRAINT generation_sessions_status_valid CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT generation_sessions_count_positive CHECK (count_requested > 0)
);

-- System metrics table - Performance and health metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric identification
    metric_type VARCHAR(100) NOT NULL, -- 'service_health', 'request_performance', 'scoring_performance', etc.
    service_name VARCHAR(100), -- Which service reported this metric
    metric_name VARCHAR(100) NOT NULL,
    
    -- Metric values
    metric_value DECIMAL(15,6),
    metric_unit VARCHAR(50), -- 'ms', 'count', 'percentage', 'bytes', etc.
    metric_tags JSONB, -- Additional metadata and tags
    
    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_period_start TIMESTAMP WITH TIME ZONE,
    time_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Context
    instance_id VARCHAR(100), -- Service instance identifier
    request_id VARCHAR(100), -- Associated request if applicable
    session_id UUID, -- Associated session if applicable
    
    -- Constraints
    CONSTRAINT system_metrics_metric_name_not_empty CHECK (LENGTH(TRIM(metric_name)) > 0)
);

-- ================================
-- LOOKUP AND REFERENCE TABLES
-- ================================

-- Categories table - Category definitions and metadata
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Category configuration
    cultural_bonus_points INTEGER DEFAULT 0,
    target_concreteness_min DECIMAL(3,2),
    preferred_word_count_min INTEGER DEFAULT 2,
    preferred_word_count_max INTEGER DEFAULT 4,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality thresholds table - Configurable scoring thresholds
CREATE TABLE quality_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threshold_type VARCHAR(50) NOT NULL, -- 'quality_classification', 'decision_recommendation'
    threshold_name VARCHAR(50) NOT NULL,
    
    -- Threshold values
    min_score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    component_requirements JSONB, -- Specific component score requirements
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT quality_thresholds_scores_valid CHECK (
        (min_score IS NULL OR min_score >= 0) AND 
        (max_score IS NULL OR max_score <= 100) AND
        (min_score IS NULL OR max_score IS NULL OR min_score <= max_score)
    ),
    CONSTRAINT quality_thresholds_unique_active UNIQUE (threshold_type, threshold_name, is_active)
        DEFERRABLE INITIALLY DEFERRED
);

-- Service health table - Service status and health history
CREATE TABLE service_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Service identification
    service_name VARCHAR(100) NOT NULL,
    service_instance VARCHAR(100),
    service_version VARCHAR(50),
    
    -- Health status
    status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'unhealthy', 'unknown'
    is_healthy BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INTEGER,
    
    -- Health details
    health_check_url VARCHAR(200),
    health_response JSONB,
    error_message TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    consecutive_successes INTEGER DEFAULT 0,
    
    -- Timing
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    
    -- Health check configuration
    check_type VARCHAR(50) DEFAULT 'http', -- 'http', 'tcp', 'custom'
    timeout_ms INTEGER DEFAULT 5000,
    
    -- Constraints
    CONSTRAINT service_health_status_valid CHECK (status IN ('healthy', 'warning', 'unhealthy', 'unknown')),
    CONSTRAINT service_health_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Phrases table indexes
CREATE INDEX idx_phrases_category ON phrases(category);
CREATE INDEX idx_phrases_status ON phrases(status);
CREATE INDEX idx_phrases_created_at ON phrases(created_at);
CREATE INDEX idx_phrases_word_count ON phrases(word_count);
CREATE INDEX idx_phrases_source ON phrases(source);
CREATE INDEX idx_phrases_generation_session ON phrases(generation_session_id);
CREATE INDEX idx_phrases_phrase_trgm ON phrases USING gin (phrase gin_trgm_ops);
CREATE INDEX idx_phrases_search ON phrases USING gin (to_tsvector('english', phrase));

-- Phrase scores table indexes
CREATE INDEX idx_phrase_scores_phrase_id ON phrase_scores(phrase_id);
CREATE INDEX idx_phrase_scores_final_score ON phrase_scores(final_score DESC);
CREATE INDEX idx_phrase_scores_quality ON phrase_scores(quality_classification);
CREATE INDEX idx_phrase_scores_decision ON phrase_scores(decision_recommendation);
CREATE INDEX idx_phrase_scores_scored_at ON phrase_scores(scored_at);
CREATE INDEX idx_phrase_scores_algorithm_version ON phrase_scores(scoring_algorithm_version);

-- Generation sessions table indexes
CREATE INDEX idx_generation_sessions_category ON generation_sessions(category);
CREATE INDEX idx_generation_sessions_status ON generation_sessions(status);
CREATE INDEX idx_generation_sessions_started_at ON generation_sessions(started_at);
CREATE INDEX idx_generation_sessions_quality_target ON generation_sessions(quality_target);
CREATE INDEX idx_generation_sessions_type ON generation_sessions(generation_type);

-- System metrics table indexes
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_service ON system_metrics(service_name);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_tags ON system_metrics USING gin (metric_tags);

-- Service health table indexes
CREATE INDEX idx_service_health_service_name ON service_health(service_name);
CREATE INDEX idx_service_health_status ON service_health(status);
CREATE INDEX idx_service_health_checked_at ON service_health(checked_at);
CREATE INDEX idx_service_health_is_healthy ON service_health(is_healthy);

-- ================================
-- TRIGGERS AND FUNCTIONS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_phrases_updated_at BEFORE UPDATE ON phrases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_thresholds_updated_at BEFORE UPDATE ON quality_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically normalize phrases
CREATE OR REPLACE FUNCTION normalize_phrase()
RETURNS TRIGGER AS $$
BEGIN
    NEW.phrase_normalized = LOWER(TRIM(NEW.phrase));
    NEW.word_count = array_length(string_to_array(TRIM(NEW.phrase), ' '), 1);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for phrase normalization
CREATE TRIGGER normalize_phrase_trigger BEFORE INSERT OR UPDATE ON phrases
    FOR EACH ROW EXECUTE FUNCTION normalize_phrase();

-- ================================
-- INITIAL DATA
-- ================================

-- Insert default categories
INSERT INTO categories (id, display_name, description, cultural_bonus_points, target_concreteness_min, is_active) VALUES
('general', 'General', 'General purpose phrases for broad topics', 0, 3.0, true),
('pop_culture', 'Pop Culture', 'Popular culture, entertainment, celebrities, media', 10, 3.5, true),
('food', 'Food & Dining', 'Food, restaurants, cooking, dining experiences', 10, 4.0, true),
('sports', 'Sports & Recreation', 'Sports, games, athletic activities, recreational pursuits', 10, 4.0, true);

-- Insert default quality thresholds for classifications
INSERT INTO quality_thresholds (threshold_type, threshold_name, min_score, max_score, is_active) VALUES
('quality_classification', 'excellent', 80, 100, true),
('quality_classification', 'good', 60, 79, true),
('quality_classification', 'acceptable', 40, 59, true),
('quality_classification', 'poor', 20, 39, true),
('quality_classification', 'unacceptable', 0, 19, true);

-- Insert default quality thresholds for decisions
INSERT INTO quality_thresholds (threshold_type, threshold_name, min_score, max_score, is_active) VALUES
('decision_recommendation', 'auto_accept', 85, 100, true),
('decision_recommendation', 'likely_accept', 70, 84, true),
('decision_recommendation', 'conditional_accept', 50, 69, true),
('decision_recommendation', 'likely_reject', 30, 49, true),
('decision_recommendation', 'auto_reject', 0, 29, true);

-- ================================
-- VIEWS FOR COMMON QUERIES
-- ================================

-- View for latest phrase scores
CREATE VIEW latest_phrase_scores AS
SELECT DISTINCT ON (ps.phrase_id)
    ps.*,
    p.phrase,
    p.category,
    p.source
FROM phrase_scores ps
JOIN phrases p ON ps.phrase_id = p.id
ORDER BY ps.phrase_id, ps.scored_at DESC;

-- View for phrase statistics by category
CREATE VIEW phrase_stats_by_category AS
SELECT 
    p.category,
    COUNT(*) as total_phrases,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_phrases,
    COUNT(CASE WHEN p.is_approved THEN 1 END) as approved_phrases,
    ROUND(AVG(lps.final_score), 2) as avg_score,
    ROUND(AVG(p.word_count), 1) as avg_word_count
FROM phrases p
LEFT JOIN latest_phrase_scores lps ON p.id = lps.phrase_id
GROUP BY p.category;

-- View for service health summary
CREATE VIEW service_health_summary AS
SELECT 
    service_name,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN is_healthy THEN 1 END) as healthy_checks,
    ROUND(COUNT(CASE WHEN is_healthy THEN 1 END) * 100.0 / COUNT(*), 2) as health_percentage,
    AVG(response_time_ms) as avg_response_time,
    MAX(checked_at) as last_check,
    MAX(CASE WHEN is_healthy THEN checked_at END) as last_healthy_check
FROM service_health
GROUP BY service_name;

-- View for generation session performance
CREATE VIEW generation_performance AS
SELECT 
    gs.category,
    gs.quality_target,
    COUNT(*) as total_sessions,
    AVG(gs.phrases_generated) as avg_phrases_generated,
    AVG(gs.acceptance_rate) as avg_acceptance_rate,
    AVG(gs.avg_quality_score) as avg_quality_score,
    AVG(gs.total_duration_ms) as avg_duration_ms,
    COUNT(CASE WHEN gs.status = 'completed' THEN 1 END) as completed_sessions
FROM generation_sessions gs
WHERE gs.status IN ('completed', 'failed')
GROUP BY gs.category, gs.quality_target; 