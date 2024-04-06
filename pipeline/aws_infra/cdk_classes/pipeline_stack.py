from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    RemovalPolicy
)

class PipelineSeqRetrievalEcrRepository:

    repository: ecr.Repository

    def __init__(self, scope: Stack) -> None:

        # Create the ECR repository
        repo = ecr.Repository(scope, "PAVI-pipeline-seq-retrieval-repo", repository_name='agr_pavi/seq_retrieval',
                              empty_on_delete=False,removal_policy=RemovalPolicy.RETAIN)
        self.repository = repo

    def get_repo_arn(self) -> str:
        return self.repository.repository_arn
