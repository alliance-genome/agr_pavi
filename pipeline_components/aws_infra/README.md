
# AGR PAVI pipeline AWS resource definitions
The code in this subdirectory defines all AWS resources required to
run the AGR PAVI pipeline component in AWS.
This is done through AWS CDK and written as Python code.

These AWS resources are automatically deployed on merge to main (through Github Actions).

All code in this subdirectory follows the [general PAVI dependency management guidelines](/README.md#dependency-management)
and the common [aws_infra](/README.md#aws-resource-definitions-aws_infra) PAVI coding guidelines.

The CDK app for this component consists of a single stack called `PaviPipelineCdkStack`,
which defines all resources required to run the pipeline in AWS batch (through Nextflow).
For testing purpose, a second development stack is defined called `PaviPipelineCdkStack-dev`,
which can be considered a copy of the prior stack and can be deployed to test changes to the
stack prior to deploying them to the main production stack.
