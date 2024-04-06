from aws_cdk import (
	Stack
)

from constructs import Construct

from cdk_classes.pipeline_stack import PipelineSeqRetrievalEcrRepository

class CdkInfraStack(Stack):

	def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
		super().__init__(scope, construct_id, **kwargs)

		PipelineSeqRetrievalEcrRepository(self)
