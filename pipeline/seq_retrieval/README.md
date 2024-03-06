# PAVI Sequence retrieval
This subdirectory contains all code and configs for the PAVI sequence retrieval component.

## Development
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
