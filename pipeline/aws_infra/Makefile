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

deps-lock-update:
	pip-compile --generate-hashes --no-strip-extras --upgrade -o requirements.txt

test-deps-lock-update:
	pip-compile --generate-hashes --no-strip-extras --extra=test --upgrade -o tests/requirements.txt

deps: requirements.txt
	pip install -r requirements.txt

test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

run-unit-tests: check-node test-deps
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-type-checks: test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: test-deps
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
