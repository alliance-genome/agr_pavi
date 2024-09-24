"""
Unit testing for the shared_cdk_classes,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import (
    App, Stack,
    aws_ecr as ecr,
    Environment as cdk_environment
)
from constructs import Construct
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from pavi_shared_aws.shared_cdk_classes.pavi_ecr_repo import PaviEcrRepository
from pavi_shared_aws.agr_aws_env import agr_aws_environment

from typing import Any


class pyTestCdkStack(Stack):

    ecr_repo: ecr.Repository

    def __init__(self, scope: Construct, construct_id: str,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
        """
        super().__init__(scope, construct_id, **kwargs)

        # Create an ECR repository
        self.ecr_repo = PaviEcrRepository(
            self, id='PAVI-pytest-ecr-repo', component_name='pytest', env_suffix='test')


app = App()
stack = pyTestCdkStack(app, "pytest-stack", env=agr_aws_environment)
template = assertions.Template.from_stack(stack)


def test_environment() -> None:
    assert isinstance(agr_aws_environment, cdk_environment)


# If any the below ECR repository names changes fromat, then ensure this change is intentional.
# If so, take below manual steps before merging to ensure correct PAVI deployment and execution:
#  * Check all dependent CDK ECR repositories in all PAVI code to match the new name format
#  * Update RepositoryName in respective unit test(s) to match the new name
#  * The old ECR repository will not be cleanup up automatically, so after merging and deployment
#    of the dependent components which define actual ECR repositories:
#    * Move All images from the old ECR repository to the new one
#      (or delete the images if no longer relevant)
#    * Delete the old ECR repository
def test_ecr_repo() -> None:
    template.has_resource(type=ResourceType.ECR_REPOSITORY.compliance_resource_type, props={
        "Properties": {
            "RepositoryName": "agr_pavi/pytest_test"
        },
        # ECR repositories must have retain policy to ensure images potentially used
        # in deployed environments or required for rollback don't get deleted on replacement.
        "UpdateReplacePolicy": "Retain"
    })
