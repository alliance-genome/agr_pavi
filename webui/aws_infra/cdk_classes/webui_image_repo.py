from constructs import Construct

from typing import Any

from pavi_shared_aws.shared_cdk_classes.image_repo_stack import ImageRepoCdkStack


class WebUiImageRepoCdkStack(ImageRepoCdkStack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any):
        super().__init__(
            scope, construct_id,
            component_name='webui',
            **kwargs)
