SUPPORTED_NODE := ^v18\.

PAVI_COMPUTE_MIN_VCPU ?= 2
ADD_CDK_ARGS ?=
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: check-venv-active check-node pip-tools _vars-% _write-lock-file

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

requirements.txt: _vars-no-upgrade _vars-main-deps _write-lock-file
	@:

tests/requirements.txt: _vars-no-upgrade _vars-test-deps _write-lock-file
	@:

update-deps-lock: _vars-upgrade-all _vars-main-deps _write-lock-file
	@:

update-test-deps-lock: _vars-upgrade-all _vars-test-deps _write-lock-file
	@:

install-deps:
	pip install -r requirements.txt

install-test-deps:
	pip install -r tests/requirements.txt

run-unit-tests: check-node install-test-deps
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
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
_vars-main-deps:
	$(eval EXTRA_PIP_COMPILE_ARGS +=-o requirements.txt)

_vars-test-deps:
	$(eval EXTRA_PIP_COMPILE_ARGS +=--extra=test -o tests/requirements.txt)

_vars-no-upgrade:
	$(eval EXTRA_PIP_COMPILE_ARGS +=--no-upgrade)

_vars-upgrade-all:
	$(eval EXTRA_PIP_COMPILE_ARGS +=--upgrade)

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
