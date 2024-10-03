from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    RemovalPolicy
)


class PaviEcrRepository(ecr.Repository):

    def __init__(self, scope: Stack, id: str, component_name: str, env_suffix: str) -> None:
        """
        Initialise a ecr.Repository instance with common setting and naming that apply to all PAVI repositories

        Args:
            scope: CDK Stack to which the construct belongs
            id: ID used to uniquely identify the construct withing the given scope
            component_name: PAVI component name, which will be used to name the repository.
            env_suffix: Deployment environment suffix, added to created repository name

        Yields:
            aws_ecr.Repository
        """
        # Create the ECR repository
        PAVI_REPO_PREFIX = 'agr_pavi/'
        repository_name = PAVI_REPO_PREFIX + component_name
        if env_suffix:
            repository_name += f'_{env_suffix}'

        super().__init__(scope, id=id, repository_name=repository_name,
                         empty_on_delete=False, removal_policy=RemovalPolicy.RETAIN)
