"""
Unit testing for the cdk_infra_stack,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import App
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from cdk_classes.cdk_infra_stack import CdkInfraStack
from agr_aws_env import agr_aws_environment

app = App()
stack = CdkInfraStack(app, "pytest-stack", env=agr_aws_environment)
template = assertions.Template.from_stack(stack)


# If any of the below ECR repository names change, then ensure this change is intentional.
# If so, take below manual steps before merging to ensure correct PAVI deployment and execution:
#  * Update all references to respective repository name in all PAVI code to match the new name
#  * Update RepositoryName in below unit test(s) to match the new name
#  * The old ECR repository will not be cleanup up automatically, so after merging and deployment:
#    * Move All images from the old ECR repository to the new one
#      (or delete the images if no longer relevant)
#    * Delete the old ECR repository
def test_pipeline_seq_retrieval_ecr_repo() -> None:
    template.has_resource(type=ResourceType.ECR_REPOSITORY.compliance_resource_type, props={
        "Properties": {
            "RepositoryName": "agr_pavi/pipeline_seq_retrieval"
        }
    })


def test_pipeline_alignment_ecr_repo() -> None:
    template.has_resource(type=ResourceType.ECR_REPOSITORY.compliance_resource_type, props={
        "Properties": {
            "RepositoryName": "agr_pavi/pipeline_alignment"
        }
    })


# Ensure any change to the bucket name is intentional, and if so, take below
# manual steps before merging to ensure correct PAVI deployment and execution:
#  * Update all references to respective bucket name in all PAVI code to match the new name
#  * Update BucketName in below unit test(s) to match the new name
#  * If the nf s3 bucket gets renamed, it will not automatically be cleaned up,
#    so after merging and deployment:
#     * Move all relevant files in the old bucket to the new one,
#       and delete all files that are no longer relevant (such as intermediate work directory files)
#     * Delete the old S3 bucket
def test_pipeline_nf_s3_bucket() -> None:
    template.has_resource(type=ResourceType.S3_BUCKET.compliance_resource_type, props={
        "Properties": {
            "BucketName": "agr-pavi-pipeline-nextflow"
        }
    })


# The S3 bucket policy is assigned to the GH-actions role for PAVI, in addition to PAVI-managed resources.
# Changing the name of this policy might require the gh-actions role to be updated to include the new role.
def test_pipeline_nf_s3_bucket_policy() -> None:
    template.has_resource(type=ResourceType.of('AWS::IAM::ManagedPolicy').compliance_resource_type, props={
        "Properties": {
            "ManagedPolicyName": "agr-pavi-pipeline-nf-bucket-access"
        }
    })


# Below tests check for resource that must be available in the stack,
# but which can be replaced/renamed without manual interventions other than
# updating all references to those resources to use the new name (check all code).
def test_pipeline_execution_environment() -> None:
    template.has_resource(type=ResourceType.BATCH_COMPUTE_ENVIRONMENT.compliance_resource_type, props={})
    template.has_resource(type=ResourceType.BATCH_JOB_QUEUE.compliance_resource_type, props={
        "Properties": {
            "JobQueueName": "pavi_pipeline"
        }
    })
