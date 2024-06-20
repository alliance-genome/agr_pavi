"""
Unit testing for the cdk_image_repo_stack,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import App
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from pavi_shared_aws_infra.shared_cdk_classes.image_repo_stack import CdkImageRepoStack

from pavi_shared_aws_infra.agr_aws_env import agr_aws_environment

app = App()
stack = CdkImageRepoStack(app, "pytest-stack", env=agr_aws_environment)
template = assertions.Template.from_stack(stack)


# If any of the below ECR repository names change, then ensure this change is intentional.
# If so, take below manual steps before merging to ensure correct PAVI deployment and execution:
#  * Update all references to respective repository name in all PAVI code to match the new name
#  * Update RepositoryName in below unit test(s) to match the new name
#  * The old ECR repository will not be cleanup up automatically, so after merging and deployment:
#    * Move All images from the old ECR repository to the new one
#      (or delete the images if no longer relevant)
#    * Delete the old ECR repository
def test_api_ecr_repo() -> None:
    template.has_resource(type=ResourceType.ECR_REPOSITORY.compliance_resource_type, props={
        "Properties": {
            "RepositoryName": "agr_pavi/api"
        }
    })
