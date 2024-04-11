from aws_cdk import (
    Stack
)

from constructs import Construct

from typing import Any

from cdk_classes.pavi_ecr_repo import PaviEcrRepository
from cdk_classes.aws_batch import PaviExecutionEnvironment


class CdkInfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, env_suffix: str = "", **kwargs: Any) -> None:
        super().__init__(scope, construct_id, **kwargs)

        PaviEcrRepository(self, id='PAVI-pipeline-seq-retrieval-repo', component_name='pipeline_seq_retrieval', env_suffix=env_suffix)
        PaviEcrRepository(self, id='PAVI-pipeline-alignment-repo', component_name='pipeline_alignment', env_suffix=env_suffix)

        PaviExecutionEnvironment(self, env_suffix=env_suffix)
