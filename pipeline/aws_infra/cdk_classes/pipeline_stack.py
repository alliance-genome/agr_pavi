from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    RemovalPolicy
)

class PaviEcrRepository:

    repository: ecr.Repository

    def __init__(self, scope: Stack, id: str, component_name: str) -> None:

        # Create the ECR repository
        PAVI_REPO_PREFIX = 'agr_pavi/'
        repository_name = PAVI_REPO_PREFIX + component_name
        repo = ecr.Repository(scope, id=id, repository_name=repository_name,
                              empty_on_delete=False,removal_policy=RemovalPolicy.RETAIN)
        self.repository = repo

    def get_repo_arn(self) -> str:
        return self.repository.repository_arn
