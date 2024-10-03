# About
This subdirectory contains a python package that is built and included in the AWS-infra code of all subcomponents of PAVI.
The source code of the package is located in the `pavi_shared_aws` subdirectory.

# Build and install
To allow this package to be included in AWS-infra of subcomponents during local development,
build and install the shared AWS package with the following command(s):
```bash
make clean build install
```
This will build the package and copy the `.whl` file to `/tmp/`, where subcomponents depending on it will search for it.
This "install" procedure is adopted because `pyproject.toml` file standards do not support dependency specifications containing
relative paths at current (2024/06/19).

This package is built and installed ad-hoc, meaning it is built and installed every time it is needed,
and is not versioned, released or deployed independently.

In order to ensure that package builds are reproducible and result in the same hash when the source did not change,
the `build` target sets the `SOURCE_DATE_EPOCH` variable to the date of the last commit made on this subdirectory before building.
This ensures the source date does not change every time a build is run, which makes the build more reproducable
(multiple builds from the same commit will always result in the same hash).  
**Note:** A consequence of this is that the hash of the `pavi_shared_aws` package will change when you build from uncommitted changes
vs when you commit those changes first and then build the package.  
Before updating dependency files of other PAVI components to include a new version of this package,
always commit changes to this directory first, before building the package and including the updated hash in other component's dependency lists.

Additionally, this package is versioned as 0.0.0 to indicate this ad-hoc build process.
The consequence of this fixed version is that when you need to update this package to a newer "version"
after having installed it in subcomponents through pip earlier, pip will refuse to update because the version did not change but the hash did.  
Uninstall the package first in order to fix this (without needing to force-reinstall all dependencies):
```bash
pip uninstall pavi_shared_aws_infra
```
