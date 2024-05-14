from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    Tags as cdk_tags
)

from constructs import Construct

from pathlib import Path
from sys import path as sys_path
from typing import Any, Optional

repo_root_path = Path(__file__).parent.parent.parent.parent
sys_path.append(str(repo_root_path))

from shared_aws_infra.shared_cdk_classes.pavi_ecr_repo import PaviEcrRepository  # noqa: E402


class CdkInfraStack(Stack):

    api_ecr_repo: ecr.Repository | ecr.IRepository

    def __init__(self, scope: Construct, construct_id: str, env_suffix: str = "",
                 shared_api_image_repo: Optional[str] = None,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            env_suffix: environment suffix, added to created resource names
            shared_api_image_repo: when defined, use ECR repo with defined the value as repoName as API image repo
        """
        super().__init__(scope, construct_id, **kwargs)

        # Import or create api_ecr_repo
        if not shared_api_image_repo:
            self.shared_api_image_repo = PaviEcrRepository(self, id='PAVI-api-repo', component_name='api',
                                                            env_suffix=env_suffix)
        else:
            self.seq_retrieval_ecr_repo = ecr.Repository.from_repository_name(self, id='PAVI-api-repo', repository_name=shared_api_image_repo)
            cdk_tags.of(self.seq_retrieval_ecr_repo).add("Product", "PAVI")
            cdk_tags.of(self.seq_retrieval_ecr_repo).add("Managed_by", "PAVI")

