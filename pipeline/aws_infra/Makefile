SUPPORTED_NODE := ^v18\.

PAVI_COMPUTE_MIN_VCPU ?= 2
CDK_STACK_NAME ?= PaviPipelineCdkStack
ADD_CDK_ARGS ?=
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: check-% deploy install-% pip-tools run-% update-% validate validate-% _vars-% _write-lock-file

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

clean:
	rm -rf node_modules/ || true

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"
	npm update --package-lock-only

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock-shared-aws-infra-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-shared-aws-infra-only))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock-shared-aws-infra-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-shared-aws-infra-only))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-cdk-cli:
	npm install

install-deps: requirements.txt
	pip install -r requirements.txt

install-deps-update-dev: check-venv-active update-deps-lock-shared-aws-infra-only update-test-deps-lock-shared-aws-infra-only
	pip uninstall -y pavi_shared_aws_infra
	pip install -U -r requirements.txt

install-test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

install-test-deps-update-dev: check-venv-active update-deps-lock-shared-aws-infra-only update-test-deps-lock-shared-aws-infra-only
	pip uninstall -y pavi_shared_aws_infra
	pip install -U -r tests/requirements.txt

run-unit-tests: install-test-deps
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	flake8 ./

validate: run-unit-tests install-cdk-cli
# Validate production stack code
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  npx cdk diff ${CDK_STACK_NAME}

validate-dev: check-venv-active validate
	@:

deploy: install-cdk-cli
	export PAVI_COMPUTE_MIN_VCPU=${PAVI_COMPUTE_MIN_VCPU} && \
	  npx cdk deploy ${CDK_STACK_NAME} ${ADD_CDK_ARGS}

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_vars-upgrade-shared-aws-infra-only:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-P pavi_shared_aws_infra"

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
