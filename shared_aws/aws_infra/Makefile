mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR := 100225593120

CDK_STACK_NAME ?= PaviSharedResourcesMainStack
VALIDATE_STACK_NAME ?= ${CDK_STACK_NAME}
ADD_CDK_ARGS ?=
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: deploy-% install-% pip-tools run-% update-% validate-% _vars-% _write-lock-file

.venv/:
	python3.12 -m venv .venv/

clean:
	rm -rf .venv/ || true
	rm -rf node_modules/ || true

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"
	npm update --package-lock-only

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

package-lock.json:
	npm install --package-lock-only

install-cdk-cli:
	npm install

install-deps: requirements.txt .venv/
	.venv/bin/pip install -r requirements.txt

install-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
	.venv/bin/pip uninstall -y pavi_shared_aws
	.venv/bin/pip install -U -r requirements.txt

install-test-deps: .venv/ tests/requirements.txt
	.venv/bin/pip install -r tests/requirements.txt

install-test-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
	.venv/bin/pip uninstall -y pavi_shared_aws
	.venv/bin/pip install -U -r tests/requirements.txt

run-unit-tests: install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: install-test-deps
	.venv/bin/python -m pytest -v

run-type-checks: install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	.venv/bin/flake8 ./

validate-stack: install-deps run-unit-tests install-cdk-cli
	. .venv/bin/activate && \
	npx cdk diff ${VALIDATE_STACK_NAME}

deploy-stack: install-deps install-cdk-cli
	. .venv/bin/activate && \
	npx cdk deploy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}

destroy-stack: install-deps install-cdk-cli
	. .venv/bin/activate && \
	npx cdk destroy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_vars-upgrade-shared-aws-only:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-P pavi_shared_aws"

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
