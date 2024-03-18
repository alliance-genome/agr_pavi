# PAVI Sequence retrieval
This subdirectory contains all code and configs for the PAVI sequence retrieval component.

## Development
### Local dev environment
In order to enable isolated local development that does not interfere with the global system python setup,
a virtual environment is used to do code development and testing for this component.

To start developing on a new system, create a virtual environment using the following command
(having this directory as your working directory):
```bash
python3.12 -m venv ./venv
```

Then when developing this component, activated the virtual environment with:
```bash
source venv/bin/activate
```
Once the virtual environment is activated, all packages will be installed in this isolated virtual environment.
To install all python package dependencies:
```bash
pip install -r requirements.txt
```

To upgrade all packages (already installed) to the latest available version matching the requirements:
```bash
pip install -U -r requirements.txt
```

Once ending development for this component, deactivate the virtual environment with:
```bash
deactivate
```

### Code guidelines
#### Input/output typing and checking
**TL;DR**  
Type hints are required wherever possible and `mypy` is used to enforce this on PR validation.  
To check all code part of the seq_retrieval module in this folder (on local development), run:
```shell
make run-python-type-check-dev
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
make run-python-type-check-dev
```

`mypy` checks are automatically run and enforced as part of the PR validation
and all reported errors must be fixed to enable merging each PR into `main`.  
If the `pipeline/seq_retrieval python typing check` status check fails on a PR in github,
click the details link and inspect the failing step output for hints on what to fix.

#### Code documentation (docstrings)
All modules, functions, classes and methods should have their input, attributes and output documented
through docstrings to make the code easy to read and understand for anyone reading it.
To ensure this is done in a uniform way accross all code, follow the [Google Python Style Guide on docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings).

#### Style
[Flake8](https://flake8.pycqa.org/en/latest/) is being used for style Guide Enforcement.
For detailed list of all rules available through flake8, see https://www.flake8rules.com/.

To check if your code complies with all style rules set by flake8, run the following command:
```shell
make run-python-style-check
```
With the flake8 output, we can now return to the code and fix the errors reported
which would otherwise result in inconsistent code style and reduced readability.

These style checks are automatically run and enforced as part of the PR validation
and all reported errors must be fixed to enable merging each PR into `main`.  
If the `pipeline/seq_retrieval python style check` status check fails on a PR in github,
click the details link and inspect the failing step output for hints on what to fix.

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
If the `pipeline/seq_retrieval unit tests` status check fails on a PR in github,
click the details link and inspect the failing step output for hints on what to fix.
