from aws_cdk import (
    Stack
)

from constructs import Construct

from typing import Any

from cdk_classes.pipeline_stack import PaviEcrRepository


class CdkInfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any) -> None:
        super().__init__(scope, construct_id, **kwargs)

        PaviEcrRepository(self, id="PAVI-pipeline-seq-retrieval-repo", component_name='pipeline_seq_retrieval')
        PaviEcrRepository(self, id="PAVI-pipeline-alignment-repo", component_name='pipeline_alignment')
