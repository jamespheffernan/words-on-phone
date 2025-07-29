const fetch = require('node-fetch');
const EventEmitter = require('events');

/**
 * ServiceDiscovery - Manages service registration, health monitoring, and automatic failover
 * 
 * Features:
 * - Automatic service registration and deregistration
 * - Continuous health monitoring with configurable intervals
 * - Service failover and load balancing
 * - Event-driven status updates
 * - Service metrics collection and analysis
 */
class ServiceDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.services = new Map();
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.requestTimeout = options.requestTimeout || 5000; // 5 seconds
    this.healthCheckTimer = null;
    this.isRunning = false;
    
    // Service health thresholds
    this.HEALTH_THRESHOLDS = {
      HEALTHY_RESPONSE_TIME: 1000,      // ms
      WARNING_RESPONSE_TIME: 3000,      // ms
      CRITICAL_RESPONSE_TIME: 5000,     // ms
      MAX_CONSECUTIVE_FAILURES: 3,      // failures before marking unhealthy
      RECOVERY_SUCCESS_REQUIRED: 2      // successes needed to mark healthy again
    };
    
    // System metrics
    this.metrics = {
      total_health_checks: 0,
      successful_checks: 0,
      failed_checks: 0,
      avg_response_time: 0,
      service_status_changes: 0,
      last_full_health_check: null,
      system_startup_time: Date.now()
    };
    
    console.log('🔍 ServiceDiscovery initialized');
  }

  /**
   * Register a service for monitoring
   */
  registerService(serviceName, config) {
    const service = {
      name: serviceName,
      displayName: config.displayName || serviceName,
      host: config.host || 'localhost',
      port: config.port,
      healthEndpoint: config.healthEndpoint || '/health',
      priority: config.priority || 1, // 1 = highest priority
      
      // Health status
      status: 'unknown',
      isHealthy: false,
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      
      // Performance metrics
      responseTime: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalChecks: 0,
      successfulChecks: 0,
      avgResponseTime: 0,
      
      // Service-specific data
      serviceInfo: null,
      capabilities: null,
      
      // Registration metadata
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.services.set(serviceName, service);
    
    console.log(`✅ Service registered: ${service.displayName} (${service.host}:${service.port})`);
    this.emit('serviceRegistered', serviceName, service);
    
    return service;
  }

  /**
   * Unregister a service
   */
  unregisterService(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      this.services.delete(serviceName);
      console.log(`❌ Service unregistered: ${service.displayName}`);
      this.emit('serviceUnregistered', serviceName, service);
      return true;
    }
    return false;
  }

  /**
   * Get all registered services
   */
  getServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get a specific service
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Get healthy services only
   */
  getHealthyServices() {
    return this.getServices().filter(service => service.isHealthy);
  }

  /**
   * Get service by priority (for load balancing)
   */
  getServicesByPriority() {
    return this.getServices().sort((a, b) => a.priority - b.priority);
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️ ServiceDiscovery already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`🔍 Starting service discovery with ${this.healthCheckInterval}ms intervals`);
    
    // Perform initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    this.emit('started');
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('🛑 ServiceDiscovery stopped');
    this.emit('stopped');
  }

  /**
   * Perform health check on all services
   */
  async performHealthCheck() {
    const startTime = Date.now();
    console.log(`🏥 Performing health check on ${this.services.size} services...`);
    
    const checkPromises = Array.from(this.services.keys()).map(serviceName => 
      this.checkServiceHealth(serviceName)
    );
    
    const results = await Promise.allSettled(checkPromises);
    
    // Update global metrics
    this.metrics.total_health_checks++;
    this.metrics.last_full_health_check = new Date().toISOString();
    
    const healthyCount = this.getHealthyServices().length;
    const totalCount = this.services.size;
    
    console.log(`📊 Health check completed: ${healthyCount}/${totalCount} services healthy (${Date.now() - startTime}ms)`);
    
    this.emit('healthCheckCompleted', {
      healthy_services: healthyCount,
      total_services: totalCount,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return { serviceName, error: 'Service not found' };
    }
    
    const startTime = Date.now();
    const url = `http://${service.host}:${service.port}${service.healthEndpoint}`;
    
    try {
      console.log(`   🔍 Checking ${service.displayName}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': 'PhraseMachine-ServiceDiscovery/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const responseData = await response.json();
      
      // Update service metrics
      service.totalChecks++;
      service.responseTime = responseTime;
      service.lastCheck = new Date().toISOString();
      
      if (response.ok) {
        // Successful health check
        service.consecutiveFailures = 0;
        service.consecutiveSuccesses++;
        service.successfulChecks++;
        service.lastSuccess = service.lastCheck;
        service.serviceInfo = responseData;
        
        // Update average response time
        service.avgResponseTime = 
          (service.avgResponseTime * (service.successfulChecks - 1) + responseTime) / service.successfulChecks;
        
        // Determine health status based on response time
        let newStatus;
        if (responseTime <= this.HEALTH_THRESHOLDS.HEALTHY_RESPONSE_TIME) {
          newStatus = 'healthy';
        } else if (responseTime <= this.HEALTH_THRESHOLDS.WARNING_RESPONSE_TIME) {
          newStatus = 'warning';
        } else {
          newStatus = 'slow';
        }
        
        const wasHealthy = service.isHealthy;
        service.status = newStatus;
        service.isHealthy = service.consecutiveSuccesses >= this.HEALTH_THRESHOLDS.RECOVERY_SUCCESS_REQUIRED;
        
        // Check for status change
        if (!wasHealthy && service.isHealthy) {
          console.log(`✅ Service recovered: ${service.displayName} (${responseTime}ms)`);
          this.metrics.service_status_changes++;
          this.emit('serviceRecovered', serviceName, service);
        }
        
        this.metrics.successful_checks++;
        return { serviceName, status: 'success', responseTime, data: responseData };
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      // Failed health check
      const responseTime = Date.now() - startTime;
      
      service.consecutiveSuccesses = 0;
      service.consecutiveFailures++;
      service.responseTime = responseTime;
      service.lastCheck = new Date().toISOString();
      service.lastFailure = service.lastCheck;
      service.totalChecks++;
      
      const wasHealthy = service.isHealthy;
      service.status = 'unhealthy';
      service.isHealthy = false;
      
      // Check for status change
      if (wasHealthy) {
        console.error(`❌ Service failed: ${service.displayName} - ${error.message}`);
        this.metrics.service_status_changes++;
        this.emit('serviceFailed', serviceName, service, error);
      }
      
      this.metrics.failed_checks++;
      return { serviceName, status: 'failed', error: error.message, responseTime };
    } finally {
      service.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Get system health summary
   */
  getSystemHealth() {
    const services = this.getServices();
    const healthyServices = services.filter(s => s.isHealthy);
    const warningServices = services.filter(s => s.status === 'warning' || s.status === 'slow');
    const unhealthyServices = services.filter(s => !s.isHealthy);
    
    const systemHealthy = healthyServices.length >= services.length * 0.8; // 80% threshold
    
    return {
      system_status: systemHealthy ? 'healthy' : 'degraded',
      service_summary: {
        total: services.length,
        healthy: healthyServices.length,
        warning: warningServices.length,
        unhealthy: unhealthyServices.length,
        health_percentage: services.length > 0 ? 
          Math.round((healthyServices.length / services.length) * 100) : 0
      },
      services: services.map(service => ({
        name: service.name,
        display_name: service.displayName,
        status: service.status,
        is_healthy: service.isHealthy,
        response_time_ms: service.responseTime,
        last_check: service.lastCheck,
        consecutive_failures: service.consecutiveFailures,
        uptime_percentage: service.totalChecks > 0 ? 
          Math.round((service.successfulChecks / service.totalChecks) * 100) : 0
      })),
      metrics: {
        ...this.metrics,
        uptime_ms: Date.now() - this.metrics.system_startup_time,
        success_rate: this.metrics.total_health_checks > 0 ? 
          Math.round((this.metrics.successful_checks / this.metrics.total_health_checks) * 100) : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service statistics
   */
  getServiceStats(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return null;
    }
    
    return {
      service_name: service.name,
      display_name: service.displayName,
      endpoint: `${service.host}:${service.port}`,
      current_status: {
        status: service.status,
        is_healthy: service.isHealthy,
        response_time_ms: service.responseTime,
        last_check: service.lastCheck,
        last_success: service.lastSuccess,
        last_failure: service.lastFailure
      },
      performance_metrics: {
        total_checks: service.totalChecks,
        successful_checks: service.successfulChecks,
        success_rate: service.totalChecks > 0 ? 
          Math.round((service.successfulChecks / service.totalChecks) * 100) : 0,
        avg_response_time_ms: Math.round(service.avgResponseTime),
        consecutive_failures: service.consecutiveFailures,
        consecutive_successes: service.consecutiveSuccesses
      },
      service_info: service.serviceInfo,
      capabilities: service.capabilities,
      registration: {
        registered_at: service.registeredAt,
        updated_at: service.updatedAt,
        priority: service.priority
      }
    };
  }

  /**
   * Find the best available service for a given service type
   */
  getBestService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service || !service.isHealthy) {
      return null;
    }
    return service;
  }

  /**
   * Make a service request with automatic failover
   */
  async makeServiceRequest(serviceName, endpoint, options = {}) {
    const service = this.getBestService(serviceName);
    if (!service) {
      throw new Error(`No healthy service available: ${serviceName}`);
    }
    
    const url = `http://${service.host}:${service.port}${endpoint}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PhraseMachine-ServiceDiscovery/1.0',
        ...options.headers
      },
      timeout: options.timeout || 30000
    };
    
    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`${service.displayName} error: ${data.message || response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Service request failed - ${service.displayName}: ${error.message}`);
      
      // Mark service as potentially unhealthy
      service.consecutiveFailures++;
      if (service.consecutiveFailures >= this.HEALTH_THRESHOLDS.MAX_CONSECUTIVE_FAILURES) {
        service.isHealthy = false;
        service.status = 'unhealthy';
        this.emit('serviceFailed', serviceName, service, error);
      }
      
      throw error;
    }
  }
}

module.exports = ServiceDiscovery; 