.PHONY: check-venv-active check-node
SUPPORTED_NODE := ^v18\.

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

check-node:
	@$(eval NODE_VERSION=$(shell node --version))
ifeq ($(shell node --version | grep -P "${SUPPORTED_NODE}"),)
	@echo 'Node version "${NODE_VERSION}" not supported!'\
		  'Change the active node version (use nvm) to match "${SUPPORTED_NODE}".'
	@exit 1
else
	@:
endif

python-dependencies:
	pip install -r requirements.txt

python-test-dependencies:
	pip install -r tests/requirements.txt

run-unit-tests: python-dependencies python-test-dependencies check-node
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config ./

run-python-style-check: python-dependencies python-test-dependencies
	flake8 ./

validate: check-node run-unit-tests
# Validate production stack code
	cdk diff PaviApiImageRepoCdkStack
	cdk diff PaviApiEbMainStack

validate-dev: check-venv-active validate
	@:
