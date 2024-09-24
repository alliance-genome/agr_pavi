from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    Tags as cdk_tags
)

from constructs import Construct

from typing import Any, Optional

from pavi_shared_aws.shared_cdk_classes.pavi_ecr_repo import PaviEcrRepository


class ImageRepoCdkStack(Stack):

    ecr_repo: ecr.Repository | ecr.IRepository

    def __init__(self, scope: Construct, construct_id: str, component_name: str, env_suffix: str = "",
                 ecr_repo_construct_id: str = 'PAVI-container-image-repo', shared_image_repo: Optional[str] = None,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            component_name: PAVI component name, which will be used to name the repository.
            env_suffix: environment suffix, added to created resource names
            ecr_repo_construct_id: construct-id to assign to the EB application in this stack. Leave default unless to migrate pre-existing ECR image repo CDK definitions into this class.
            shared_image_repo: when defined, use ECR repo with defined the value as repoName as image repo
        """
        super().__init__(scope, construct_id, **kwargs)

        # Import or create ecr_repo
        if not shared_image_repo:
            self.ecr_repo = PaviEcrRepository(
                self, id=ecr_repo_construct_id,
                component_name=component_name, env_suffix=env_suffix
            )
            cdk_tags.of(self.ecr_repo).add("Product", "PAVI")
            cdk_tags.of(self.ecr_repo).add("Managed_by", "PAVI")
        else:
            self.ecr_repo = ecr.Repository.from_repository_name(self, id=ecr_repo_construct_id, repository_name=shared_image_repo)
