# AGR PAVI
AGR's Proteins Annotations and Variants Inspector

## Tabel of content
 * [Architecture](#architecture)
 * [Development principles and guidelines](#development-principles-and-guidelines)
    * [Dependency management](#dependency-management)
       * [Dependency and version specifications](#dependency-and-version-specifications)
       * [Dependency updates](#dependency-updates)
       * [Installing dependencies](#installing-dependencies)
    * [Python components](#python-components)
       * [Virtual environment](#virtual-environments)
       * [Dependency management](#dependency-management-1)
       * [Typing](#typing)
       * [Styling](#styling)
       * [Unit and integration testing](#unit--integration-testing)
    * [Javascript components](#javascript-components)
       * [Virtual environment](#local-dependencies)
       * [Dependency management](#dependency-management-2)
       * [Typing](#typing-1)
       * [Styling](#styling-1)
       * [Unit and integration testing](#unit--integration-testing-1)
    * [AWS resource definitions (aws_infra)](#aws-resource-definitions-aws_infra)
 * [Acknowledgements](#acknowledgements)
 * [Maintainers](#maintainers)


## Architecture
Section TODO.

## Development principles and guidelines
This project is divided in subcomponents which function independently but share similar concepts in their setup.
All components have a `Makefile` in their subdirectory that contains all targets for code validation, dependency management,
build and deployment. Below subchapters describe common concepts and make targets used for specific groups of subcomponents.

### Dependency management
#### Dependency and version specifications
Application dependencies are defined either the `pyproject.toml` file for python dependencies,
or the `package.json` file for node.js dependencies.

Furthermore, version specifications should use wildcards or version specifiers such as the compatible
release clause (`~=` in python, `~` in node.js) to allow for automatic upgrades to newer patch and optionally
minor versions which are expected not to cause any breakage while improving security and stability.
A lock file must be used to freeze all dependencies to specific versions, and this lock file must be
committed to the repository, so that builds and runs on different environments all result in the same
product, and dependency updates can always be validated before being applied to production environments.

#### Dependency updates
Flexible dependency version specifications as defined above allow for a separation between low-risk version upgrades,
which are expected to pass all validations without requiring additional changes, and more high-risk version upgrades,
which are more likely to require code changes to make the code work with the upgraded dependency.

To update the dependency lock files to apply the latest available low-risk dependency version upgrades:
```bash
# To update all dependency lock files (within a subcomponent)
make update-deps-locks-all
```

For high-risk upgrades, update the version specified in the `pyproject.toml` and/or the `package.json` file,
then run the above make target to update the lock file(s).
Run all tests to validate the code still works and update as required if not.

Low-risk updates are automatically applied on PR validation to all pull requests requesting to merge into the `main` branch,
unless the `no-deps-lock-updates` label is added to the PR.
High-risk upgrades are proposed regularly by dependabot by means of PRs with version update proposals,
as configured in the [`dependabot.yml`](/.github/dependabot.yml) file.
See the [Github Docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates) for more details on the specifications for the dependabot configuration file.

#### Installing dependencies
To install all component dependencies (frozen versions defined in the lock file):
```bash
# To install application dependencies only
make install-deps
# To install application and test dependencies
make install-test-deps
# To install all dependencies
make install-deps-all
```

### Python components
In addition to the general development principles and concepts described above,
PAVI components using python use the following python-specific general concepts.
#### Virtual environments
All python components use virtual environments to isolate the build- and application dependencies from the global system python setup.
Make targets to create these virtual environments can be found in the [PAVI root Makefile](/Makefile). However, these do not need to be
created manually, as they are automatically created as and when appropriate (when calling Make targets requiring them).
 * The `.venv/` directory is used as virtual environment for application dependencies.
 * The `.venv-build/` directory is used as virtual environment for dependency management requirements
   such as pip-tools, which are installed independently of the application dependencies.

Make targets depending on these virtual environments will and should use the binaries and libraries
installed in these virtual environment, without requiring them to be activated.

The virtual environment can be activated environment-wide by calling below command,
should this be needed for development or troubleshooting purpose (VSCode will active
the application `.venv` automatically when opening a new terminal for that directory.
```bash
source .venv/bin/activate
```

Once the virtual environment is activated, all python command will now automatically use
the python binaries and dependencies installed in this isolated virtual environment.

To deactivate an active virtual environment run the `deactivate` command.

#### Dependency management
##### Dependency and version specifications
Application dependencies are defined in the `pyproject.toml` file and should follow the [python guidelines](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/#dependencies-and-requirements).
This is required to ensure compatibility with external dependency managers such as dependabot.

At time of writing, dependency specifications used by poetry 1.* do not adhere to the python guidelines
(specifically, its `pyproject.toml` file usage is not PEP-621 compatible), which makes it incompatible
with dependabot (which can only update the `poetry.lock` file but not the dependency versions specified
in the `pyproject.toml` file as a consequence). Due to this, the decision was made not to use poetry,
at least until it becomes PEP-621 compatible (which is expected to be from the poetry 2.* release).

As an alternative, all PAVI python components currently use `pip-tools` for dependency management.
This is done by converting the flexible dependency specifiers from the `pyproject.toml` file to
frozen versions in `requirements.txt` files. As a consequence, dependabot can not distinguish project
dependencies from subdependencies (something that is possible through poetry) and will propose updates
for subdependencies where that may not be appropriate. Such subdependencies must be added to the relevant
`ignore:` sections in the [dependabot.yml](/.github/dependabot.yml) configuration file to disable such update proposals.

#### Typing
While Python uses dynamic typic (aka duck typing) at runtime, it supports the use of type hints
to declare intended types which can be used by IDEs and type checkers to provide code completion,
usage hints and warning where incompatible types are used.
This provides a way to catch more potential bugs during development, before they arise in deployed
environments and require tedious troubleshooting. Therefor, all PAVI subcomponents should use type hints
wherever possible. `mypy` is used a type checker, and is run on all python subcomponents on every PR
to ensure code of good quality.

To run type checks:
```bash
make run-type-checks
```

#### Styling
To ensure consistent code styling is used accross components, `flake8` is used as linter in all python components.
These style checks are enforced through PR validation, where they need to pass before enabling PR merge.

To run style checks:
```bash
make run-style-checks
```

#### Unit & integration testing
Unit and integration testing for python components is done through `pytest`,
and all unit and integration tests must pass before PRs can be approved and merged.

To run unit testing as a developer (generating an inspectable HTML report):
```bash
make run-unit-tests-dev
```

### Javascript components
#### Local dependencies
By default, `npm` (the default Node.js Package Manager) downloads dependencies into a local `node_modules` subdirectory,
and we make us of this feature to isolation dependencies independently for each of the PAVI components.

#### Dependency management
##### Dependency and version specifications
Dependency management for node depencies is done using `npm`.
Application dependencies are defined in the `package.json` file (with flexible version specifications),
and frozen in the `package-lock.json` file.

#### Typing
As Javascript uses dynamic typic at runtime and does not support native type hints,
[TypeScript](https://www.typescriptlang.org/) is used instead as development language,
which is transpiled to javascript on build and deployment.
Using Typescript over plain Javascript adds support for code-completion, usage hints and
warnings on usage of incompatible types by IDEs and type checkers, providing a way to
catch more potential bugs during development, before they arise in deployed environments
and require tedious troubleshooting.
Therefor, all PAVI subcomponents requiring javascript code should use Typescript.
The typescript compiler `tsc` is used a type checker, and is run on all Typescript subcomponents
on every PR, to ensure code of good quality.

As Typescript is uses Javascript code with additional syntax for types,
this Typescript code is easy to read and write by any Javascript developer.

To run type checks:
```bash
make run-type-checks
```

#### Styling
To ensure consistent code styling is used accross components, `eslint` is used as linter in all javascript/typescript components.
These style checks are enforced through PR validation, where they need to pass before enabling PR merge.

To run style checks:
```bash
make run-style-checks
```

#### Unit & integration testing
Unit and integration testing for javascript/react components is done through `jest`,
and all unit and integration tests must pass before PRs can be approved and merged.

To run unit testing as a developer:
```bash
make run-unit-tests
```

### AWS resource definitions (aws_infra)
All PAVI components are deployed to AWS, and deployment of those components usually depends on certain AWS resources
such as ECR registries to upload the container images to, Elastic Beanstalk Applications to deploy the application services to
or AWS Batch and ECS to execute pipeline jobs.
All these AWS resources are defined as code through [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html),
which can be found in the `aws_infra` subdirectory of the respective components' directory.

To allow better interoperability and code sharing, all AWS CDK code in PAVI is written in Python,
independent of the language used for the component it serves. This way, all AWS CDK code can import
the `pavi_shared_aws` package (found in the [/shared_aws/py_package/](/shared_aws/py_package/) directory),
which holds all AWS CDK code and classes shared accross multiple components.
While shared AWS CDK code is stored in the `pavi_shared_aws` package, shared AWS resource which
are managed by PAVI but used by multiple components (such as the AWS Chatbot configuration)
are defined in the [/shared_aws/aws_infra/](/shared_aws/aws_infra/) directory,
which holds the AWS CDK definitions for those AWS resources.

While the CDK code is written in Python, the CDK CLI which is used for validation and deployment
of the AWS resources defined is installed through `npm`, and has its version defined and frozen
in the `package.json` and the `package-lock.json` files respectively.

All CDK-defined AWS resource defininitions are validated on every PR, and automatically deployed on merge to main.

## Acknowledgements
Just as most modern software, PAVI heavily relies on third-party tools and libraries for much of its core functionality.
We specifically acknowledge the creators and developers of the following third-party tools and libraries:
 * BioPython: [Cock PJ, Antao T, Chang JT, et al. Biopython: freely available Python tools for computational molecular biology and bioinformatics. Bioinformatics. 2009;25(11):1422-1423. doi:10.1093/bioinformatics/btp163](https://pubmed.ncbi.nlm.nih.gov/19304878/)
 * Nextflow: [Di Tommaso P, Chatzou M, Floden EW, Barja PP, Palumbo E, Notredame C. Nextflow enables reproducible computational workflows. Nat Biotechnol. 2017;35(4):316-319. doi:10.1038/nbt.3820](https://pubmed.ncbi.nlm.nih.gov/28398311/)
 * PySam: https://github.com/pysam-developers/pysam
 * Samtools: [Danecek P, Bonfield JK, Liddle J, et al. Twelve years of SAMtools and BCFtools. Gigascience. 2021;10(2):giab008. doi:10.1093/gigascience/giab008](https://pubmed.ncbi.nlm.nih.gov/33590861/)

## Maintainers
Current maintainer: [Manuel Luypaert](https://github.com/mluypaert)
