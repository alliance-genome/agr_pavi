.PHONY: check-venv-active check-node pip-tools

SUPPORTED_NODE := ^v18\.

PAVI_COMPUTE_MIN_VCPU ?= 2
ADD_CDK_ARGS ?=

.venv/:
	python3.12 -m venv .venv/

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source .venv/bin/activate`,'\
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

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	pip-compile --generate-hashes --no-strip-extras -o requirements.txt

tests/requirements.txt:
	pip-compile --generate-hashes --no-strip-extras --extra=test -o tests/requirements.txt

python-dependencies-lock-update:
	pip-compile --generate-hashes --no-strip-extras --upgrade -o requirements.txt

python-test-dependencies-lock-update:
	pip-compile --generate-hashes --no-strip-extras --extra=test --upgrade -o tests/requirements.txt

python-dependencies: requirements.txt
	pip install -r requirements.txt

python-test-dependencies: tests/requirements.txt
	pip install -r tests/requirements.txt

run-unit-tests: check-node python-test-dependencies
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-python-type-check: python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config ./

run-python-style-check: python-test-dependencies
	flake8 ./

validate: check-node run-unit-tests
# Validate production stack code
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  cdk diff PaviPipelineCdkStack

validate-dev: check-venv-active validate
	@:

deploy:
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  cdk deploy PaviPipelineCdkStack ${ADD_CDK_ARGS}
