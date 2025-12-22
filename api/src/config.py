"""
Configuration module for PAVI API.

This module provides environment-specific configuration for the API,
supporting development, staging, and production environments.
"""

import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Environment(str, Enum):
    """Supported deployment environments."""
    LOCAL = "local"
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


@dataclass
class PipelineConfig:
    """Configuration for the pipeline execution."""
    # Step Functions
    state_machine_arn: Optional[str]
    use_step_functions: bool

    # DynamoDB
    jobs_table_name: str

    # S3
    results_bucket: str
    work_bucket: str

    # Batch
    job_queue_arn: Optional[str]

    # Feature flags
    enable_step_functions_rollout: bool
    step_functions_rollout_percentage: int  # 0-100


@dataclass
class APIConfig:
    """Main API configuration."""
    environment: Environment
    debug: bool
    pipeline: PipelineConfig

    # API settings
    api_host: str
    api_port: int

    # Nextflow settings (legacy)
    nextflow_out_dir: str
    pipeline_image_tag: str


def get_environment() -> Environment:
    """Determine the current environment from environment variables."""
    env_str = os.environ.get('PAVI_ENVIRONMENT', 'local').lower()
    try:
        return Environment(env_str)
    except ValueError:
        return Environment.LOCAL


def get_config() -> APIConfig:
    """
    Get the configuration for the current environment.

    Configuration is loaded from environment variables with sensible defaults.
    """
    env = get_environment()

    # Determine Step Functions settings based on environment
    use_step_functions = os.environ.get('USE_STEP_FUNCTIONS', 'false').lower() == 'true'

    # Feature flag for gradual rollout
    enable_rollout = os.environ.get('ENABLE_STEP_FUNCTIONS_ROLLOUT', 'false').lower() == 'true'
    rollout_percentage = int(os.environ.get('STEP_FUNCTIONS_ROLLOUT_PERCENTAGE', '0'))

    # Environment-specific defaults
    env_defaults = {
        Environment.LOCAL: {
            'state_machine_arn': None,
            'jobs_table': 'pavi-jobs-local',
            'results_bucket': 'agr-pavi-pipeline-local',
            'work_bucket': 'agr-pavi-pipeline-local',
            'job_queue_arn': None,
        },
        Environment.DEV: {
            'state_machine_arn': os.environ.get('STEP_FUNCTIONS_STATE_MACHINE_ARN'),
            'jobs_table': 'pavi-jobs-dev',
            'results_bucket': 'agr-pavi-pipeline-stepfunctions-dev',
            'work_bucket': 'agr-pavi-pipeline-nextflow',
            'job_queue_arn': os.environ.get('BATCH_JOB_QUEUE_ARN'),
        },
        Environment.STAGING: {
            'state_machine_arn': os.environ.get('STEP_FUNCTIONS_STATE_MACHINE_ARN'),
            'jobs_table': 'pavi-jobs-staging',
            'results_bucket': 'agr-pavi-pipeline-stepfunctions-staging',
            'work_bucket': 'agr-pavi-pipeline-nextflow',
            'job_queue_arn': os.environ.get('BATCH_JOB_QUEUE_ARN'),
        },
        Environment.PROD: {
            'state_machine_arn': os.environ.get('STEP_FUNCTIONS_STATE_MACHINE_ARN'),
            'jobs_table': 'pavi-jobs-prod',
            'results_bucket': 'agr-pavi-pipeline-stepfunctions-prod',
            'work_bucket': 'agr-pavi-pipeline-nextflow',
            'job_queue_arn': os.environ.get('BATCH_JOB_QUEUE_ARN'),
        },
    }

    defaults = env_defaults.get(env, env_defaults[Environment.LOCAL])

    pipeline_config = PipelineConfig(
        state_machine_arn=os.environ.get(
            'STEP_FUNCTIONS_STATE_MACHINE_ARN',
            defaults['state_machine_arn']
        ),
        use_step_functions=use_step_functions,
        jobs_table_name=os.environ.get('DYNAMODB_JOBS_TABLE', defaults['jobs_table']),
        results_bucket=os.environ.get('PAVI_RESULTS_BUCKET', defaults['results_bucket']),
        work_bucket=os.environ.get('PAVI_WORK_BUCKET', defaults['work_bucket']),
        job_queue_arn=os.environ.get('BATCH_JOB_QUEUE_ARN', defaults['job_queue_arn']),
        enable_step_functions_rollout=enable_rollout,
        step_functions_rollout_percentage=rollout_percentage,
    )

    return APIConfig(
        environment=env,
        debug=os.environ.get('DEBUG', 'false').lower() == 'true',
        pipeline=pipeline_config,
        api_host=os.environ.get('API_HOST', '0.0.0.0'),
        api_port=int(os.environ.get('API_PORT', '8080')),
        nextflow_out_dir=os.environ.get('API_NEXTFLOW_OUT_DIR', './'),
        pipeline_image_tag=os.environ.get('API_PIPELINE_IMAGE_TAG', 'latest'),
    )


def should_use_step_functions(config: APIConfig, job_id: Optional[str] = None) -> bool:
    """
    Determine if Step Functions should be used for a given job.

    This function supports gradual rollout by using a percentage-based
    decision based on the job ID hash.

    Args:
        config: API configuration
        job_id: Optional job ID for consistent routing

    Returns:
        True if Step Functions should be used, False otherwise
    """
    # If Step Functions is disabled, always use Nextflow
    if not config.pipeline.use_step_functions:
        return False

    # If rollout is disabled, use Step Functions for all jobs
    if not config.pipeline.enable_step_functions_rollout:
        return True

    # Gradual rollout based on job ID hash
    if job_id and config.pipeline.step_functions_rollout_percentage < 100:
        # Use hash of job ID for consistent routing
        hash_value = hash(job_id) % 100
        return hash_value < config.pipeline.step_functions_rollout_percentage

    return config.pipeline.step_functions_rollout_percentage >= 100


# Singleton config instance
_config: Optional[APIConfig] = None


def get_api_config() -> APIConfig:
    """Get or create the singleton API configuration."""
    global _config
    if _config is None:
        _config = get_config()
    return _config
