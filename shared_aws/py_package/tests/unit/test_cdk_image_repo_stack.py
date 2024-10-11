"""
Unit testing for the cdk_image_repo_stack,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import App
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from pavi_shared_aws.shared_cdk_classes.image_repo_stack import ImageRepoCdkStack
from pavi_shared_aws.agr_aws_env import agr_aws_environment

app = App()
# If below function signature changes (function name, parameters keys or values), ensure this change is intentional.
# If so, commit, build and install the new package.
# Then update all PAVI components implementing this Class method to:
#  1. Implement the new package
#      1.1 run `make update-deps-locks-all` to update the lock files
#      1.2 run `pip uninstall pavi_shared_aws` to uninstall the old package version
#      1.3 run `make install-test-deps` to install the new version
#  2. Open the IDE to update all code implementing the ImageRepoCdkStack class to use the new signature.
stack = ImageRepoCdkStack(app, "pytest-stack", component_name='new_component', env=agr_aws_environment)
template = assertions.Template.from_stack(stack)


# If the below ECR repository name changes, then ensure this change is intentional,
# as it can potentially break a lot of AWS infrastructure of other PAVI components
# implementing the ImageRepoCdkStack class (and depending on the name format to stay the same).
def test_ecr_repo_name() -> None:
    template.has_resource(type=ResourceType.ECR_REPOSITORY.compliance_resource_type, props={
        "Properties": {
            "RepositoryName": "agr_pavi/new_component"
        }
    })
