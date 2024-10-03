
# AGR PAVI infra using CDK (Python)

This is the AWS infrastructure shared betweeen multiple components of AGR PAVI.
This is defined and deployed using AWS CDK and written as Python code in this subdirectory.

AWS CDK is an open-source framework that enables writing
the entire cloud application as code, including all event sources and other AWS resources
which are require to make the application executable in AWS in addition to the application code.
This allows for an easy and reproducible deployment, that can be fully documented and versioned as code.

To install the AWS CDK CLI, run `make install-cdk-cli`.

CDK CLI tool used for this repository is tested and deployed using node.js v18.


As this project is set up as a Python project, it is advised to use [virtualenv](https://docs.python.org/3/library/venv.html)
to allow isolated dependency installation. Furthermore, it is advised to store
the virtual env in a `venv` subdirectory in this directory.
As this path was added to the .gitignore file, it will automatically be excluded
from any git operations.

To create a new virtual environment (for first first time use of this directory):
```bash
$ make .venv/
```

Then for every subsequent use of this directory (for coding, deployment, ...)

First activate the virtualenv:
```bash
$ source .venv/bin/activate
```

Once the virtualenv is activated, install the required dependencies:
```bash
$ make install-deps
```

After that, you can execute all required CDK commands as described in below chapters.
Once done working with the code in this directory, deactivate the virtualenv:
```bash
$ deactivate
```

## Dependencies
The code in this subdirectory depends on a set of shared AWS infra modules and variables,
built as a python package from the `/shared_aws/py_package/` directory in this repository.

Before proceeding to run or make any changes in this repository, build and install
this shared AWS module by following the [build-and-install](../../shared_aws/py_package/README.md#build-and-install) instructions in the README.

## Important files
Two standard CDK configuration files can be found at the root level of this directory:
 * [cdk.json](./cdk.json)
    Contains the main CDK execution configuration parameters
 * [cdk.context.json](./cdk.context.json)
    Contains the VPC context in which to deploy the CDK Stack.

Then the AWS Stack to be deployed using CDK is define in the following files and directories:
 * [cdk_app.py](./cdk_app.py)
    The root level CDK application, defining the entire AWS Stack to be deployed.
 * [cdk_classes/](./cdk_classes/)
    Python sub-classes defining the CDK stack (representing a single CloudFormation stack)
    and all individual CDK constructs, representing individual cloud components.

## Validating
When making changes to any of the CDK files, validate them before requesting a PR
or attempting a deployment.

**Note**: as part of the validation requires comparison to deployed resources,
you need to be authenticateable to AWS before you can run below validation target.

To validate the CDK code run the following command:
```bash
make validate-dev
```
This make target will run two things:

First it will run the unit tests (through the Makefile's `run-unit-tests-dev` target),
which test CDK code for resource definitions exepected by other parts of this repository,
to ensure updates to the CDK code don't accidentally remove or rename essential AWS resources.

After the unit tests pass, it will run `cdk diff` on the production stack,
which compares the production stack defined in the code to the deployed stack
and displays the changes that would get deployed. 
Inspect these changes to ensure the code changes made will have the expected effect
on the deployed AWS resources.
As `cdk diff` will synthesize the full (Cloudformation) stack to do so, it will
produce errors when errors are present in any of the CDK code (where those
errors would not have been caught by the unit tests).

If the validation reports any errors, inspect them and correct the code accordingly.

This validation step allows the developer to fix any errors before deployment,
reducing the amount of troubleshooting and fixing that would otherwise be required
on failing or incorrect deployments.

**Note**:  
While some of the existing CDK code (at time of writing, 2024-04-10)
references to external resource in AWS (outside of the CDK stack defined here),
unit testing does not actually query those resources.
As a result, unit testing will not catch changes to or error in those (external) resource definitions.  
Only `cdk diff` will query actual AWS resources and produce
errors accordingly if there would be any issues with such externally defined resources.
Consequently, the `cdk diff` step in the `validate-dev` make recipe requires AWS authentication.

## Deployment
After making all necessary changes to the CDK code and [validating](#validating)
the resulting stack changes are as expected, you can deploy
the new stack to AWS by running the following command:
```bash
# This command will interactively ask for confirmation before deploying security-sensitive changes.
# To disable this approval (e.g. for use in CI/CD pipelines), add "--require-approval never"
> cdk deploy
```
Any code pushed to the main branch of this repository (both main application and CDK code)
automatically gets built and deployed, through [github actions](./.github/workflows/main-build-and-deploy.yml).

## Other useful CDK commands
Here's a list of the most useful CDK commands. For a full list, call `cdk help`.
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to AWS
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
