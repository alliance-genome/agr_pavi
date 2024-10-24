# PAVI Sequence retrieval
This subdirectory contains all code and configs for the PAVI sequence retrieval component.

## Content table
 * [Development](#development)
    * [Local dev environment](#local-dev-environment)
    * [Code guidelines](#code-guidelines)
 * [Building](#building)
 * [Usage](#usage)

## Development
The API code is written in python, so follows the [general](/README.md#dependency-management) and [python](/README.md#python-components) PAVI coding guidelines.

### Code guidelines
#### Input/output typing and checking
**TL;DR**  
Type hints are required wherever possible and `mypy` is used to enforce this on PR validation.  
To check all code part of the seq_retrieval module in this folder (on local development), run:
```shell
make run-type-checks-dev
```

**Detailed explanation**  
Altought the Python interpreter always uses dynamic typing, it is recommended to use type hints wherever possible,
to ensure all functions and methods always receive the expected type as to not get caught by unexpected errors.

As an example, the following untyped python function will define local cache usage behavior taking a boolean as toggle:
```python
def set_local_cache_reuse(reuse):
    """
    Define whether or not data_file_mover will reuse files in local cache where already available pre-execution.

    Args:
        reuse (bool): set to `True` to enable local cache reuse behavior (default `False`)
    """
    global _reuse_local_cache
    _reuse_local_cache = reuse
    if reuse:
        print("Local cache reuse enabled.")
    else:
        print("Local cache reuse disabled.")
```

When called with boolean values, this function works just fine:
```python
>>> set_local_cache_reuse(True)
Local cache reuse enabled.
>>> set_local_cache_reuse(False)
Local cache reuse disabled.
```
However when calling with a String instead of a boolean, you may get unexpected behaviour:
```python
>>> set_local_cache_reuse("False")
Local cache reuse enabled.
```
This happens because Python dynamically types and converts types at runtime,
and all strings except empty ones are converted to boolean value `True`.

To prevent this, add type hints to your code:
```python
def set_local_cache_reuse(reuse: bool) -> None:
    """
    Define whether or not data_file_mover will reuse files in local cache where already available pre-execution.

    Args:
        reuse (bool): set to `True` to enable local cache reuse behavior (default `False`)
    """
    global _reuse_local_cache
    _reuse_local_cache = reuse
    if reuse:
        print("Local cache reuse enabled.")
    else:
        print("Local cache reuse disabled.")
set_local_cache_reuse("False")
```

Type hints themselves are not enforced at runtime, and will thus not stop the code from running (incorrectly),
but using `myPy` those errors can be revealed before merging this code. Storing the above code snippet in a file
called `set_local_cache_reuse.py` and running `myPy` on it gives the following result:
```shell
> mypy set_local_cache_reuse.py
set_local_cache_reuse.py:9: error: Name "_reuse_local_cache" is not defined  [name-defined]
set_local_cache_reuse.py:14: error: Argument 1 to "set_local_cache_reuse" has incompatible type "str"; expected "bool"  [arg-type]
Found 2 errors in 1 file (checked 1 source file)
```
With the myPy output, we can now return to the code and fix the errors reported
which would otherwise result in silent unexpected behavior and bugs.

To run `mypy` on the seq_retrieval module in this folder in your local development environment,
run the following shell command:
```shell
make run-type-checks-dev
```

`mypy` checks are automatically run and enforced as part of the PR validation
and all reported errors must be fixed to enable merging each PR into `main`.  
If the `pipeline/seq_retrieval code checks` status check fails on a PR in github,
click the details link and check which step failed, and investigate the step output
for hints on what to fix. The python type checks are run in the `Code typing test` step.

#### Code documentation (docstrings)
All modules, functions, classes and methods should have their input, attributes and output documented
through docstrings to make the code easy to read and understand for anyone reading it.
To ensure this is done in a uniform way accross all code, follow the [Google Python Style Guide on docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings).

#### Style
[Flake8](https://flake8.pycqa.org/en/latest/) is being used for style Guide Enforcement.
For detailed list of all rules available through flake8, see https://www.flake8rules.com/.

To check if your code complies with all style rules set by flake8, run the following command:
```shell
make run-style-checks
```
With the flake8 output, we can now return to the code and fix the errors reported
which would otherwise result in inconsistent code style and reduced readability.

These style checks are automatically run and enforced as part of the PR validation
and all reported errors must be fixed to enable merging each PR into `main`.  
If the `pipeline/seq_retrieval code checks` status check fails on a PR in github,
click the details link and check which step failed, and investigate the step output
for hints on what to fix. The python style checks are run in the `Code style test` step.

#### Unit testing
[Pytest](https://pytest.org/) is being used for unit testing.

To run unit testing locally, run the following command:
```shell
make run-unit-tests
```

A minimum of 80% code coverage is required to ensure new code gets approriate unit
testing before getting merged, which ensures the code is functional and won't break
unnoticed in future development iterations.  
All unit tests are automatically run and enforced as part of the PR validation
and all reported errors must be fixed to enable merging each PR into `main`.  
If the `pipeline/seq_retrieval code checks` status check fails on a PR in github,
click the details link and check which step failed, and investigate the step output
for hints on what to fix. The unit tests are run in the `Run unit tests` step.

## Building
To build a clean docker image (for production usage and troubleshooting):
```bash
make clean docker-image
```

## Usage
This PAVI component is intented to be called as a container.
To call the container after building:
```bash
docker run agr_pavi/pipeline_seq_retrieval main.py
```
