from constructs import Construct

from typing import Any

from pavi_shared_aws.shared_cdk_classes.image_repo_stack import ImageRepoCdkStack


class ApiImageRepoCdkStack(ImageRepoCdkStack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any):
        super().__init__(
            scope, construct_id,
            component_name='api',
            ecr_repo_construct_id='PAVI-api-repo',
            **kwargs)
