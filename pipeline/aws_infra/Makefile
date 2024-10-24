mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

PAVI_COMPUTE_MIN_VCPU ?= 2
CDK_STACK_NAME ?= PaviPipelineCdkStack
ADD_CDK_ARGS ?=
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: deploy install-% run-% update-% validate validate-%

.venv/:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) .venv/

clean:
	rm -rf node_modules/ || true
	rm -rf .venv/ || true

requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) requirements.txt

tests/requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) tests/requirements.txt

package-lock.json:
	npm install --package-lock-only

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-deps-lock

update-test-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-test-deps-lock

update-deps-lock-shared-aws-only:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-deps-lock-shared-aws-only

update-test-deps-lock-shared-aws-only:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-test-deps-lock-shared-aws-only

update-cdk-cli-lock: package-lock.json
	npm update --package-lock-only

update-deps-locks-all: update-deps-lock update-test-deps-lock update-cdk-cli-lock
	@:

install-cdk-cli: package-lock.json
	npm install

install-cdk-cli-update-dev:
	@$(MAKE) --no-print-directory update-cdk-cli-lock
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-deps

install-deps-update-dev: .venv/
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-deps-lock
	@$(MAKE) --no-print-directory install-deps

install-test-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-test-deps

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

validate: install-deps run-unit-tests install-cdk-cli
# Validate production stack code
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  . .venv/bin/activate && \
	  npx cdk diff ${CDK_STACK_NAME}

validate-dev: validate
	@:

deploy: install-deps install-cdk-cli
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  . .venv/bin/activate && \
	  npx cdk deploy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}
