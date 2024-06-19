# About
This subdirectory contains a python package that is built and included in the AWS-infra code of all subcomponents of PAVI.
The source code of the python package is located in the `pavi_shared_aws_infra` subdirectory.

# Build and install
To allow this package to be included in AWS-infra of subcomponents during local development,
build and install the shared AWS infra package with the following command(s):
```bash
make clean build install
```
This will build the package and copy the `.whl` file to `/tmp/`, where subcomponents depending on it will search for it.
This "install" procedure is adopted becaues `pyproject.toml` file standards do not support dependency specifications containing
relative paths at current (2024/06/19).

This package is versioned as 0.0.0 to indicate its ad-hoc build and install process,
meaning it is built and installed every time it is needed, and is not versioned, released or deployed independently.
As a consequence, when you need to update this package to a newer "version" after having installed it in subcomponents
through pip earlier, pip will refuse to update because the version did not change but the hash did.
Uninstall the package first in order to fix this (without needing to force-reinstall all dependencies):
```bash
pip uninstall pavi_shared_aws_infra
```
