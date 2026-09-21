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

    # Local pipeline execution (for EC2 deployment)
    use_local_pipeline: bool = False
    local_jobs_path: str = "/tmp/pavi/jobs"
    local_results_path: str = "/tmp/pavi/results"
    local_work_path: str = "/tmp/pavi/work"
    local_max_workers: int = 4  # Max parallel sequence retrieval tasks


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
    env_str = os.environ.get("PAVI_ENVIRONMENT", "local").lower()
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

    # Check for local pipeline mode
    # Defaults to True for LOCAL environment (no Nextflow dependency)
    use_local_pipeline_env = os.environ.get("USE_LOCAL_PIPELINE")
    if use_local_pipeline_env is not None:
        use_local_pipeline = use_local_pipeline_env.lower() == "true"
    else:
        # Auto-detect: LOCAL environment uses local pipeline by default
        use_local_pipeline = env == Environment.LOCAL

    # Determine Step Functions settings based on environment
    # Can be overridden via USE_STEP_FUNCTIONS env var
    # Local pipeline mode disables both Step Functions and Nextflow
    use_step_functions_env = os.environ.get("USE_STEP_FUNCTIONS")
    if use_local_pipeline:
        use_step_functions = False
    elif use_step_functions_env is not None:
        use_step_functions = use_step_functions_env.lower() == "true"
    else:
        # AWS environments use Step Functions
        use_step_functions = env != Environment.LOCAL

    # Feature flag for gradual rollout
    enable_rollout = (
        os.environ.get("ENABLE_STEP_FUNCTIONS_ROLLOUT", "false").lower() == "true"
    )
    rollout_percentage = int(os.environ.get("STEP_FUNCTIONS_ROLLOUT_PERCENTAGE", "0"))

    # Environment-specific defaults
    env_defaults = {
        Environment.LOCAL: {
            "state_machine_arn": None,
            "jobs_table": "pavi-jobs-local",
            "results_bucket": "agr-pavi-pipeline-local",
            "work_bucket": "agr-pavi-pipeline-local",
            "job_queue_arn": None,
        },
        Environment.DEV: {
            "state_machine_arn": os.environ.get("STEP_FUNCTIONS_STATE_MACHINE_ARN"),
            "jobs_table": "pavi-jobs-dev",
            "results_bucket": "agr-pavi-pipeline-stepfunctions-dev",
            "work_bucket": "agr-pavi-pipeline-nextflow",
            "job_queue_arn": os.environ.get("BATCH_JOB_QUEUE_ARN"),
        },
        Environment.STAGING: {
            "state_machine_arn": os.environ.get("STEP_FUNCTIONS_STATE_MACHINE_ARN"),
            "jobs_table": "pavi-jobs-staging",
            "results_bucket": "agr-pavi-pipeline-stepfunctions-staging",
            "work_bucket": "agr-pavi-pipeline-nextflow",
            "job_queue_arn": os.environ.get("BATCH_JOB_QUEUE_ARN"),
        },
        Environment.PROD: {
            "state_machine_arn": os.environ.get("STEP_FUNCTIONS_STATE_MACHINE_ARN"),
            "jobs_table": "pavi-jobs-prod",
            "results_bucket": "agr-pavi-pipeline-stepfunctions-prod",
            "work_bucket": "agr-pavi-pipeline-nextflow",
            "job_queue_arn": os.environ.get("BATCH_JOB_QUEUE_ARN"),
        },
    }

    defaults = env_defaults.get(env, env_defaults[Environment.LOCAL])

    # These defaults are always strings in env_defaults
    jobs_table = defaults["jobs_table"]
    results_bucket = defaults["results_bucket"]
    work_bucket = defaults["work_bucket"]
    assert isinstance(jobs_table, str)
    assert isinstance(results_bucket, str)
    assert isinstance(work_bucket, str)

    # Local pipeline configuration
    local_jobs_path = os.environ.get("PAVI_LOCAL_JOBS_PATH", "/tmp/pavi/jobs")
    local_results_path = os.environ.get("PAVI_LOCAL_RESULTS_PATH", "/tmp/pavi/results")
    local_work_path = os.environ.get("PAVI_LOCAL_WORK_PATH", "/tmp/pavi/work")
    local_max_workers = int(os.environ.get("PAVI_LOCAL_MAX_WORKERS", "4"))

    pipeline_config = PipelineConfig(
        state_machine_arn=os.environ.get("STEP_FUNCTIONS_STATE_MACHINE_ARN")
        or defaults["state_machine_arn"],
        use_step_functions=use_step_functions,
        jobs_table_name=os.environ.get("DYNAMODB_JOBS_TABLE") or jobs_table,
        results_bucket=os.environ.get("PAVI_RESULTS_BUCKET") or results_bucket,
        work_bucket=os.environ.get("PAVI_WORK_BUCKET") or work_bucket,
        job_queue_arn=os.environ.get("BATCH_JOB_QUEUE_ARN")
        or defaults["job_queue_arn"],
        enable_step_functions_rollout=enable_rollout,
        step_functions_rollout_percentage=rollout_percentage,
        use_local_pipeline=use_local_pipeline,
        local_jobs_path=local_jobs_path,
        local_results_path=local_results_path,
        local_work_path=local_work_path,
        local_max_workers=local_max_workers,
    )

    return APIConfig(
        environment=env,
        debug=os.environ.get("DEBUG", "false").lower() == "true",
        pipeline=pipeline_config,
        api_host=os.environ.get("API_HOST", "0.0.0.0"),
        api_port=int(os.environ.get("API_PORT", "8080")),
        nextflow_out_dir=os.environ.get("API_NEXTFLOW_OUT_DIR", "./"),
        pipeline_image_tag=os.environ.get("API_PIPELINE_IMAGE_TAG", "latest"),
    )


def should_use_local_pipeline(config: APIConfig) -> bool:
    """
    Determine if local pipeline execution should be used.

    Local pipeline mode runs seq_retrieval and alignment directly as Python
    modules instead of using Step Functions or Nextflow.

    Args:
        config: API configuration

    Returns:
        True if local pipeline should be used, False otherwise
    """
    return config.pipeline.use_local_pipeline


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
    # Local pipeline mode takes precedence
    if config.pipeline.use_local_pipeline:
        return False

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
