from constructs import Construct

from typing import Any

from pavi_shared_aws.shared_cdk_classes.application_stack import EBApplicationCdkStack


class WebUiEbApplicationCdkStack(EBApplicationCdkStack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any):
        super().__init__(
            scope, construct_id,
            component_name='webui',
            **kwargs)
