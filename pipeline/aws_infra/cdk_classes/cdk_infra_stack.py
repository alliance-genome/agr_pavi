from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    Tags as cdk_tags
)

from constructs import Construct

from typing import Any, Optional

from pavi_shared_aws_infra.shared_cdk_classes.pavi_ecr_repo import PaviEcrRepository
from cdk_classes.aws_batch import PaviExecutionEnvironment


class CdkInfraStack(Stack):

    seq_retrieval_ecr_repo: ecr.Repository | ecr.IRepository
    alignment_ecr_repo: ecr.Repository | ecr.IRepository
    execution_environment: PaviExecutionEnvironment

    def __init__(self, scope: Construct, construct_id: str, env_suffix: str = "",
                 shared_seq_retrieval_image_repo: Optional[str] = None,
                 shared_alignment_image_repo: Optional[str] = None,
                 shared_work_dir_bucket: Optional[str] = None,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            env_suffix: environment suffix, added to created resource names
            shared_seq_retrieval_image_repo: when defined, use ECR repo with defined the value as repoName as seq_retrieval image repo
            shared_alignment_image_repo: when defined, use ECR repo with defined the value as repoName as alignment image repo
            shared_work_dir_bucket: when defined, use S3 bucket with defined the value as bucketName as Nextflow workdir bucket
        """
        super().__init__(scope, construct_id, **kwargs)

        # Import or create seq_retrieval_ecr_repo
        if not shared_seq_retrieval_image_repo:
            self.seq_retrieval_ecr_repo = PaviEcrRepository(self, id='PAVI-pipeline-seq-retrieval-repo', component_name='pipeline_seq_retrieval',
                                                            env_suffix=env_suffix)
        else:
            self.seq_retrieval_ecr_repo = ecr.Repository.from_repository_name(self, id='PAVI-pipeline-seq-retrieval-repo', repository_name=shared_seq_retrieval_image_repo)
            cdk_tags.of(self.seq_retrieval_ecr_repo).add("Product", "PAVI")
            cdk_tags.of(self.seq_retrieval_ecr_repo).add("Managed_by", "PAVI")

        # Import or create shared_alignment_image_repo
        if not shared_alignment_image_repo:
            self.alignment_ecr_repo = PaviEcrRepository(self, id='PAVI-pipeline-alignment-repo', component_name='pipeline_alignment',
                                                        env_suffix=env_suffix)
        else:
            self.alignment_ecr_repo = ecr.Repository.from_repository_name(self, id='PAVI-pipeline-alignment-repo', repository_name=shared_alignment_image_repo)
            cdk_tags.of(self.alignment_ecr_repo).add("Product", "PAVI")
            cdk_tags.of(self.alignment_ecr_repo).add("Managed_by", "PAVI")

        self.execution_environment = PaviExecutionEnvironment(self, env_suffix=env_suffix, shared_work_dir_bucket=shared_work_dir_bucket)
