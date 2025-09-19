mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../../common_make

CDK_STACK_NAME ?= PaviSharedResourcesMainStack
VALIDATE_STACK_NAME ?= ${CDK_STACK_NAME}
ADD_CDK_ARGS ?=

.PHONY: deploy-% install-% run-% update-% validate-%

clean:
	rm -rf .venv/ || true
	rm -rf node_modules/ || true

update-deps-lock: update-python-deps-lock

update-test-deps-lock: update-python-test-deps-lock

update-deps-lock-shared-aws-only: update-python-deps-lock-shared-aws-only

update-test-deps-lock-shared-aws-only: update-python-test-deps-lock-shared-aws-only

update-cdk-cli-lock: update-node-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock update-cdk-cli-lock
	@:

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

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: .venv/ install-test-deps
	.venv/bin/python -m pytest -v

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

validate-stack: .venv/ install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk diff ${VALIDATE_STACK_NAME}

validate-all: run-unit-tests validate-stack
	@:

deploy-stack: .venv/ install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk deploy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}

destroy-stack: .venv/ install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk destroy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}
