mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../../common_make

PAVI_COMPUTE_MIN_VCPU ?= 2
CDK_STACK_NAME ?= PaviPipelineCdkStack
ADD_CDK_ARGS ?=

.PHONY: deploy install-% run-% update-% validate validate-%

clean:
	rm -rf node_modules/ || true
	rm -rf .venv/ || true

update-deps-lock: update-python-deps-lock

update-deps-lock-shared-aws-only: update-python-deps-lock-shared-aws-only

update-test-deps-lock: update-python-test-deps-lock

update-test-deps-lock-shared-aws-only: update-python-test-deps-lock-shared-aws-only

update-cdk-cli-lock: update-node-deps-lock

update-deps-locks-all:
	@$(MAKE) --no-print-directory update-deps-lock
	@$(MAKE) --no-print-directory update-test-deps-lock
	@$(MAKE) --no-print-directory update-cdk-cli-lock

install-cdk-cli: install-node-deps

install-cdk-cli-update-dev:
	@$(MAKE) --no-print-directory update-cdk-cli-lock
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps: install-python-deps

install-deps-update-dev: .venv/
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-deps-lock
	@$(MAKE) --no-print-directory install-deps

install-test-deps: install-python-test-deps

install-test-deps-update-dev: .venv/
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-test-deps-lock
	@$(MAKE) --no-print-directory install-test-deps

install-deps-all:
	@$(MAKE) --no-print-directory install-deps
	@$(MAKE) --no-print-directory install-test-deps
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps-update-all:
	@$(MAKE) --no-print-directory update-deps-locks-all
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory install-deps-all

run-unit-tests: install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: run-unit-tests
	@:

run-type-checks: install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	.venv/bin/flake8 ./

validate-stack: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory _vars-node-npx-exec))
# Validate production stack code
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  . .venv/bin/activate && \
	  ${NPX_EXEC} cdk diff ${CDK_STACK_NAME}

validate-all: run-unit-tests validate-stack
	@:

validate-dev: validate
	@:

deploy: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory _vars-node-npx-exec))
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  . .venv/bin/activate && \
	  ${NPX_EXEC} cdk deploy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}
