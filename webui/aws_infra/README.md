
# AGR PAVI webUI AWS resource definitions
The code in this subdirectory defines all AWS resources required to
run the AGR PAVI webUI component in AWS.
This is done through AWS CDK and written as Python code.

These AWS resources are automatically deployed on merge to main (through Github Actions).

All code in this subdirectory follows the [general PAVI dependency management guidelines](/README.md#dependency-management)
and the common [aws_infra](/README.md#aws-resource-definitions-aws_infra) PAVI coding guidelines.

The CDK app for this component consists of three stacks:
1. A stack called `PaviWebUiImageRepoCdkStack`,
   which defines all AWS resources required for uploading and storing the component container image.
2. A stack called `PaviWebUiEbApplicationCdkStack`,
   which defines all AWS resources required for managing and uploading component versions
   and runtime deployment configurations shared accross environments.
3. A stack called `PaviWebUiEbMainStack`
   which defines all AWS resources required to run the webUI in Elastic Beanstalk.
   This includes environments-specific runtime configurations.

For testing purpose, a second environment stack is defined called `PaviWebUiEbDevStack`,
which can be considered a copy of the `PaviWebUiEbMainStack` stack and can be deployed
to test changes to this stack prior to deploying them to the main production stack.
