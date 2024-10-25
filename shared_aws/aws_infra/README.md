
# Shared AGR PAVI AWS resource definitions
The code in this subdirectory defines all AWS resources
that are used by multiple components in AWS.
This is done through AWS CDK and written as Python code.

These AWS resources are automatically deployed on merge to main (through Github Actions).

All code in this subdirectory follows the [general PAVI dependency management guidelines](/README.md#dependency-management)
and the common [aws_infra](/README.md#aws-resource-definitions-aws_infra) PAVI coding guidelines.

The CDK app for this consists of a single stack called `PaviSharedResourcesMainStack`.
